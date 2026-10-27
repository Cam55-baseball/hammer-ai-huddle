import { describe, expect, it } from "vitest";
import { seasonStatGroups } from "../seasonStats";
describe("subscription and sport season statistics", () => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport} Complete Pitcher focuses only on pitching`, () => {
      expect(seasonStatGroups(sport, [`${sport}_pitcher`]).map(g => g.category.split(" ·")[0])).toEqual(["Season", "Pitching"]);
    });
    it(`${sport} Golden 2Way covers all relevant work`, () => {
      const groups = seasonStatGroups(sport, [`${sport}_golden2way`]);
      expect(groups.map(g => g.category.split(" ·")[0])).toEqual(["Season", "Hitting", "Pitching", "Fielding", "Baserunning"]);
      const keys = groups.flatMap(g => g.fields.map(f => f.key));
      expect(keys.includes("home_runs_allowed")).toBe(sport === "baseball");
      expect(keys.includes("k_per_7")).toBe(sport === "softball");
      expect(keys).toContain("batters_faced");
    });
  }
});