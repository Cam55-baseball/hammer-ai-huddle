/**
 * Owner Nov 5 (late): coaches' saved lineups. Private to the coach (RLS: coach_id = auth.uid());
 * only the coach's connected players can be added (RLS re-checks coach_connected_to).
 */
export interface LineupPlayer { athlete_id: string; jersey: string }
export interface DraftRow { athlete_id: string; name: string; jersey: string; included: boolean }

/** Checks a lineup before saving. Returns the players to save or a plain error. */
export function validateLineup(name: string, rows: readonly DraftRow[], connected: ReadonlySet<string>): { players: LineupPlayer[]; error: string | null } {
  if (!name.trim()) return { players: [], error: "Name the lineup (for example \"Varsity vs lefties\")." };
  const picked = rows.filter((r) => r.included);
  if (!picked.length) return { players: [], error: "Add at least one player." };
  const seen = new Set<string>();
  for (const r of picked) {
    if (!connected.has(r.athlete_id)) return { players: [], error: `${r.name} isn't one of your connected players.` };
    const j = r.jersey.trim();
    if (!/^\d{1,3}$/.test(j)) return { players: [], error: `Give ${r.name} a jersey number.` };
    if (seen.has(j)) return { players: [], error: `Two players can't share #${j}.` };
    seen.add(j);
  }
  return { players: picked.map((r) => ({ athlete_id: r.athlete_id, jersey: r.jersey.trim() })), error: null };
}

/** True when the current rows match the saved lineup exactly (the server checks jerseys against it). */
export function sameAsSaved(rows: readonly DraftRow[], saved: readonly LineupPlayer[] | null | undefined): boolean {
  if (!saved) return false;
  const a = rows.filter((r) => r.included).map((r) => `${r.athlete_id}#${r.jersey.trim()}`).sort();
  const b = saved.map((p) => `${p.athlete_id}#${String(p.jersey).trim()}`).sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Draft rows for every connected player, prefilled from a saved lineup when given. */
export function draftFrom(connected: readonly { id: string; name: string }[], saved?: readonly LineupPlayer[] | null): DraftRow[] {
  const by = new Map((saved ?? []).map((p) => [p.athlete_id, String(p.jersey)]));
  return connected.map((c) => ({ athlete_id: c.id, name: c.name, jersey: by.get(c.id) ?? "", included: by.has(c.id) }));
}

type Db = { from: (t: string) => any };
const fail = (e: any) => { if (e) throw new Error(String(e.message ?? e).includes("duplicate") ? "Two players can't share a jersey number." : "Couldn't save the lineup. Try again."); };

export async function saveLineup(db: Db, coachId: string, name: string, players: LineupPlayer[]): Promise<string> {
  const { data, error } = await db.from("coach_lineups").insert({ coach_id: coachId, name: name.trim() }).select("id").single();
  fail(error);
  const id = data.id as string;
  const r = await db.from("coach_lineup_players").insert(players.map((p) => ({ lineup_id: id, ...p })));
  if (r.error) { await db.from("coach_lineups").delete().eq("id", id); fail(r.error); }
  return id;
}

export async function updateLineup(db: Db, id: string, name: string, players: LineupPlayer[]): Promise<void> {
  fail((await db.from("coach_lineups").update({ name: name.trim() }).eq("id", id)).error);
  fail((await db.from("coach_lineup_players").delete().eq("lineup_id", id)).error);
  fail((await db.from("coach_lineup_players").insert(players.map((p) => ({ lineup_id: id, ...p })))).error);
}

export async function renameLineup(db: Db, id: string, name: string): Promise<void> {
  if (!name.trim()) throw new Error("Name the lineup.");
  fail((await db.from("coach_lineups").update({ name: name.trim() }).eq("id", id)).error);
}

export async function deleteLineup(db: Db, id: string): Promise<void> {
  fail((await db.from("coach_lineup_players").delete().eq("lineup_id", id)).error);
  fail((await db.from("coach_lineups").delete().eq("id", id)).error);
}
