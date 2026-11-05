/** Owner Nov 5 (late): saved coach lineups + coach check-ins & readiness. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { validateLineup, sameAsSaved, draftFrom, saveLineup, updateLineup, renameLineup, deleteLineup } from "@/lib/coach/savedLineups";
import { readinessColor, readinessSeries, missedDays, injuryLines, loadLevel } from "@/lib/coach/checkinReadiness";
import { CoachCheckinsReadinessView, TeamReadinessStripView, NOT_SHARED } from "@/components/coach/CoachCheckinsReadinessTab";

/** In-memory stand-in that applies the same ownership/connection rules as the database policies. */
function fakeDb(me: string, connected: Set<string>) {
  const t: Record<string, any[]> = { coach_lineups: [], coach_lineup_players: [] };
  const owns = (lid: string) => t.coach_lineups.some((l) => l.id === lid && l.coach_id === me);
  const deny = { message: "new row violates row-level security policy" };
  return { t, from(table: string) {
    let filt: [string, any] | null = null;
    const rows = () => t[table].filter((r) => (!filt || r[filt[0]] === filt[1]) && (table === "coach_lineups" ? r.coach_id === me : owns(r.lineup_id)));
    const q: any = {
      insert(v: any) {
        const list = Array.isArray(v) ? v : [v];
        const bad = list.some((r) => table === "coach_lineups" ? r.coach_id !== me : !owns(r.lineup_id) || !connected.has(r.athlete_id));
        const made = bad ? [] : list.map((r) => ({ id: `id${Math.random()}`, ...r }));
        if (!bad) t[table].push(...made);
        const res = { data: made, error: bad ? deny : null };
        return { ...res, select: () => ({ single: () => ({ data: made[0], error: res.error }) }) };
      },
      update(v: any) { return { eq: (k: string, val: any) => { filt = [k, val]; rows().forEach((r) => Object.assign(r, v)); return { error: null }; } }; },
      delete() { return { eq: (k: string, val: any) => { filt = [k, val]; const kill = new Set(rows()); t[table] = t[table].filter((r) => !kill.has(r)); return { error: null }; } }; },
    };
    return q;
  } };
}

describe("saved lineups", () => {
  const connected = new Set(["a", "b", "c"]);
  const roster = [{ id: "a", name: "Ana" }, { id: "b", name: "Ben" }, { id: "c", name: "Cy" }];
  it("save → reuse → edit → delete", async () => {
    const db = fakeDb("coach1", connected);
    const draft = draftFrom(roster).map((r) => r.athlete_id === "c" ? r : { ...r, included: true, jersey: r.athlete_id === "a" ? "7" : "12" });
    const v = validateLineup("Varsity vs lefties", draft, connected);
    expect(v.error).toBeNull();
    const id = await saveLineup(db as any, "coach1", "Varsity vs lefties", v.players);
    const saved = db.t.coach_lineup_players.filter((p) => p.lineup_id === id);
    // reuse: prefilled players/jerseys, still editable
    const reused = draftFrom(roster, saved);
    expect(reused.filter((r) => r.included).map((r) => `${r.name}#${r.jersey}`)).toEqual(["Ana#7", "Ben#12"]);
    expect(sameAsSaved(reused, saved)).toBe(true);
    const edited = reused.map((r) => r.athlete_id === "c" ? { ...r, included: true, jersey: "3" } : r);
    expect(sameAsSaved(edited, saved)).toBe(false);
    await updateLineup(db as any, id, "Varsity vs lefties", validateLineup("x", edited, connected).players);
    expect(db.t.coach_lineup_players.filter((p) => p.lineup_id === id)).toHaveLength(3);
    await renameLineup(db as any, id, "JV");
    expect(db.t.coach_lineups[0].name).toBe("JV");
    await deleteLineup(db as any, id);
    expect(db.t.coach_lineups).toHaveLength(0);
    expect(db.t.coach_lineup_players).toHaveLength(0);
  });
  it("only connected players, unique jerseys, a name", () => {
    const d = draftFrom([...roster, { id: "z", name: "Zed" }]).map((r) => ({ ...r, included: true, jersey: String(r.name.length) }));
    expect(validateLineup("T", d, connected).error).toMatch(/connected/);
    expect(validateLineup("", d, connected).error).toMatch(/Name/);
    expect(validateLineup("T", d.slice(0, 3), connected).error).toMatch(/share/);
  });
  it("another coach is blocked (same rule as the database policy)", async () => {
    const db = fakeDb("coach1", connected);
    const id = await saveLineup(db as any, "coach1", "Mine", [{ athlete_id: "a", jersey: "1" }]);
    const other = fakeDb("coach2", connected); other.t.coach_lineups = db.t.coach_lineups; other.t.coach_lineup_players = db.t.coach_lineup_players;
    await deleteLineup(other as any, id);
    expect(db.t.coach_lineups).toHaveLength(1);
    await expect(saveLineup(other as any, "coach1", "Steal", [{ athlete_id: "a", jersey: "2" }])).rejects.toThrow();
  });
  it("database policies: owner-only writes, players through the parent lineup and connection", () => {
    const dir = "drizzle/migrations";
    const sql = readdirSync(dir).filter((f) => f.includes("coach_saved_lineups")).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
    for (const c of ["INSERT", "UPDATE", "DELETE"]) expect(sql).toMatch(new RegExp(`ON public.coach_lineups FOR ${c}`));
    expect(sql).toContain("public.coach_connected_to(auth.uid(), athlete_id)");
    expect(sql).toContain("resolve_recruiting_scope(_athlete, 'health')");
  });
});

describe("coach check-ins & readiness", () => {
  const today = "2026-11-05";
  const shared = {
    shared: true, today,
    checkins: [
      { entry_date: "2026-11-05", readiness: 2, hours_slept: 6, energy: 2, pain_location: ["right_elbow"], pain_scale: 3, pain_scales: { right_elbow: 3 } },
      { entry_date: "2026-11-03", readiness: 4, hours_slept: 8, energy: 4, pain_location: ["right_elbow"], pain_scales: { right_elbow: 5 } },
      { entry_date: "2026-11-02", readiness: 5 },
    ],
    daily_logs: [], load: [{ plan_date: "2026-11-04", items: 12 }, { plan_date: "2026-10-20", items: 6 }],
  };
  it("colors: 4–5 good, 3 okay, 1–2 low", () => {
    expect([5, 4, 3, 2, 1, null].map(readinessColor)).toEqual(["good", "good", "okay", "low", "low", "none"]);
  });
  it("trend, missed days, injury progress and load", () => {
    expect(readinessSeries(shared.checkins, today, 14)).toHaveLength(14);
    expect(missedDays(shared.checkins, today, 7)).toHaveLength(4);
    expect(injuryLines(shared.checkins, [])[0].meaning).toMatch(/going down/);
    expect(loadLevel(shared.load, today).level).toBe("high");
  });
  it("a sharing player's data shows for their connected coach", () => {
    render(<CoachCheckinsReadinessView data={shared} />);
    expect(screen.getByTestId("checkins-readiness")).toBeTruthy();
    expect(screen.getByText(/Pain flag: right elbow/)).toBeTruthy();
    expect(screen.getAllByText(/What this means/).length).toBeGreaterThanOrEqual(4);
  });
  it("a non-sharing player's data never shows", () => {
    render(<CoachCheckinsReadinessView data={{ shared: false }} />);
    expect(screen.getByText(NOT_SHARED)).toBeTruthy();
    expect(screen.queryByTestId("checkins-readiness")).toBeNull();
  });
  it("dashboard strip: colors, who hasn't checked in, and not-shared players", () => {
    render(<TeamReadinessStripView rows={[
      { athlete_id: "1", name: "Ana", shared: true, checked_in: true, readiness: 5 },
      { athlete_id: "2", name: "Ben", shared: true, checked_in: false },
      { athlete_id: "3", name: "Cy", shared: false },
    ]} />);
    expect(screen.getByText("Ana · Good")).toBeTruthy();
    expect(screen.getByText(/Not checked in yet: Ben/)).toBeTruthy();
    expect(screen.getByText(`Cy · ${NOT_SHARED}`)).toBeTruthy();
  });
  it("the server refuses a coach who isn't connected", () => {
    const sql = readdirSync("drizzle/migrations").filter((f) => f.includes("coach_saved_lineups")).map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).join("\n");
    expect(sql).toMatch(/coach_athlete_checkins_28[\s\S]*is_coach_of\(_me, _athlete\) OR public.is_linked_coach\(_me, _athlete\)[\s\S]*not authorized/);
  });
});
