import { describe, expect, it } from "vitest";
import { fielding, hitting, pitching, zoneCounts } from "@/lib/scout/gamePlay";

describe("scout game play", () => {
  it("builds the hitting line from logged at-bats only", () => {
    const h = hitting({ results: ["1B", "HR", "BB", "K", "FO"], steals: 1, steal_logs: 2 });
    expect(h).toEqual({ atBats: 4, hits: 2, extraBaseHits: 1, walks: 1, strikeouts: 1, stolenBases: 1 });
  });
  it("leaves stolen bases unmeasured when no base running was logged", () => {
    expect(hitting({ results: ["1B"], steals: 0, steal_logs: 0 })?.stolenBases).toBeNull();
    expect(hitting({ results: [], steals: 0, steal_logs: 0 })).toBeNull();
  });
  it("returns no pitching or fielding when nothing was logged", () => {
    expect(pitching({ pitches: 0, top_velo: null })).toBeNull();
    expect(fielding({ putouts: 0, assists: 0, errors: 0, defense_logs: 0 })).toBeNull();
  });
  it("counts pitch locations and skips unknown shapes", () => {
    expect(zoneCounts([{ zone: 5 }, { zone: 5 }, { outZone: "high" }, { zone: 12 }, null])).toEqual({ zones: { 5: 2 }, outside: 1, total: 3 });
  });
});
