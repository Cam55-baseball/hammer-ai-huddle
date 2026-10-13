import { describe, it, expect } from "vitest";
import { guardSinglePlayer, guardLineupPlay, cleanStats } from "./coachLogging";

const lineup = [
  { athlete_id: "a", jersey: "7", name: "Sam" },
  { athlete_id: "b", jersey: "12", name: "Lee" },
];

describe("coach logging wrong-player guards", () => {
  it("Option 1 blocks a save for a different player than the locked one", () => {
    expect(guardSinglePlayer("a", "b").ok).toBe(false);
    expect(guardSinglePlayer("a", "a")).toEqual({ ok: true, athleteId: "a" });
    expect(guardSinglePlayer(null, "a").ok).toBe(false);
  });
  it("Option 2 blocks when the confirmed name doesn't match the tapped jersey", () => {
    const r = guardLineupPlay(lineup, "7", "b");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("Sam");
  });
  it("Option 2 needs a jersey tap and a name check", () => {
    expect(guardLineupPlay(lineup, null, "a").ok).toBe(false);
    expect(guardLineupPlay(lineup, "7", null).ok).toBe(false);
    expect(guardLineupPlay(lineup, "99", "a").ok).toBe(false);
    expect(guardLineupPlay(lineup, "12", "b")).toEqual({ ok: true, athleteId: "b" });
  });
  it("stats: blanks are left out, hits can't exceed at-bats", () => {
    expect(cleanStats({ ab: "3", hits: "1", rbi: "" })).toEqual({ stats: { ab: 3, hits: 1 }, error: null });
    expect(cleanStats({ ab: "1", hits: "2" }).error).toBeTruthy();
    expect(cleanStats({ ab: "1.5" }).error).toBeTruthy();
    expect(cleanStats({}).error).toBeTruthy();
  });
});
