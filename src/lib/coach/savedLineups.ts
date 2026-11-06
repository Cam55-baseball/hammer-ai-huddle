/**
 * Owner Nov 5 (late): coaches' saved lineups. Private to the coach (RLS: coach_id = auth.uid());
 * only the coach's connected players can be added (RLS re-checks coach_connected_to).
 */
export interface LineupPlayer { athlete_id: string; jersey: string; position?: string | null; batting_order?: number | null }
export interface DraftRow { athlete_id: string; name: string; jersey: string; included: boolean; position?: string; order?: string }

/** Owner Nov 5 (late): sport-correct positions; softball adds DP and Flex. */
export const BASEBALL_POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
export const SOFTBALL_POSITIONS = [...BASEBALL_POSITIONS, "DP", "FLEX"] as const;
export const positionsFor = (sport: "baseball" | "softball"): readonly string[] => sport === "softball" ? SOFTBALL_POSITIONS : BASEBALL_POSITIONS;
export const positionLabel = (p: string) => p === "FLEX" ? "Flex" : p;

/** This game's spot for each included player (position + batting order), for that player's game line. */
export function gameSpots(rows: readonly DraftRow[]): Record<string, { position: string | null; order: number | null }> {
  const out: Record<string, { position: string | null; order: number | null }> = {};
  for (const r of rows) if (r.included) out[r.athlete_id] = { position: r.position || null, order: r.order ? Number(r.order) : null };
  return out;
}

/** Adds the lineup spot to a player's game details (their own entries win). */
export function withLineupSpot<T extends { values: Record<string, string>; positions?: string[] }>(d: T, spot?: { position: string | null; order: number | null }): T {
  if (!spot) return d;
  const positions = d.positions?.length ? d.positions : spot.position ? [spot.position] : [];
  const values = { ...d.values };
  if (!values.lineup_slot && spot.order) values.lineup_slot = String(spot.order);
  return { ...d, positions, values };
}

/** Checks a lineup before saving. Returns the players to save or a plain error. */
export function validateLineup(name: string, rows: readonly DraftRow[], connected: ReadonlySet<string>, sport: "baseball" | "softball" = "softball"): { players: LineupPlayer[]; error: string | null } {
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
  const orders = new Set<string>();
  for (const r of picked) {
    if (r.position && !positionsFor(sport).includes(r.position)) return { players: [], error: `${positionLabel(r.position)} isn't a ${sport} position (${r.name}).` };
    if (r.order) {
      const n = Number(r.order);
      if (!Number.isInteger(n) || n < 1 || n > 12) return { players: [], error: `Batting order for ${r.name} must be 1 to 12.` };
      if (orders.has(r.order)) return { players: [], error: `Two players can't both bat #${n}.` };
      orders.add(r.order);
    }
  }
  return { players: picked.map((r) => ({ athlete_id: r.athlete_id, jersey: r.jersey.trim(), position: r.position || null, batting_order: r.order ? Number(r.order) : null })), error: null };
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
  const by = new Map((saved ?? []).map((p) => [p.athlete_id, p]));
  return connected.map((c) => { const p = by.get(c.id); return { athlete_id: c.id, name: c.name, jersey: p ? String(p.jersey) : "", included: !!p, position: p?.position ?? "", order: p?.batting_order ? String(p.batting_order) : "" }; });
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
