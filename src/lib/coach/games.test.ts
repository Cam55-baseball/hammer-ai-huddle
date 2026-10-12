import { describe, it, expect } from "vitest";
import { hittingLine, scoreLine, seasonTotals } from "./games";

describe("coach game stats", () => {
  it("walks and hit-by-pitch are not at-bats", () => {
    expect(hittingLine(["2B", "FO", "HBP", "BB"], 2)).toBe("1 for 2 (2B), 2 RBI");
  });
  it("no at-bats logged means no line", () => {
    expect(hittingLine([], 0)).toBeNull();
  });
  it("missing score says so", () => {
    expect(scoreLine({ my_score: null, opp_score: 3 })).toBe("Score not entered");
    expect(scoreLine({ my_score: 5, opp_score: 3 })).toBe("Won 5–3");
  });
  it("totals add up across games", () => {
    const g = (results: string[], pitches: number) => ({ game_id: "x", game_date: "2026-10-01", opponent: null, my_score: null, opp_score: null, results, rbi: 0, pitches });
    expect(seasonTotals([g(["HR", "FO"], 20), g(["1B", "BB"], 15)])).toEqual({ hits: 2, ab: 3, pitches: 35 });
  });
});
