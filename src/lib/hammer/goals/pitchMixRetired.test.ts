import { describe, it, expect } from "vitest";
import { offeredSubGoalsFor, findSubGoal } from "./subGoalCatalog";

describe("pitch mix removed from goal picks", () => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport}: not offered, but old saved picks still resolve`, () => {
      expect(offeredSubGoalsFor(sport, "pitcher", "pitching").map((g) => g.id)).not.toContain("pitch_mix");
      expect(findSubGoal(sport, "pitcher", "pitching", "pitch_mix")).not.toBeNull();
    });
  }
});
