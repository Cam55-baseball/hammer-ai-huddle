import { describe, expect, it } from "vitest";
import { offeredSubGoalsFor, findSubGoal } from "./subGoalCatalog";
describe("fielding and throwing goal separation", () => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport} retires transfer and long toss without deleting saved goals`, () => {
      const offered = offeredSubGoalsFor(sport, "position", "throwing").map(g => g.id);
      expect(offered).not.toContain("transfer_exchange"); expect(offered).not.toContain("long_toss_capacity");
      expect(offered).toContain("arm_health"); expect(offered).toContain("throw_carry");
      expect(findSubGoal(sport, "position", "throwing", "transfer_exchange")).not.toBeNull();
    });
    it(`${sport} offers fielding footwork and routine plays instead of double-play specialty`, () => {
      const offered = offeredSubGoalsFor(sport, "position", "fielding").map(g => g.id);
      expect(offered).toContain("hands"); expect(offered).toContain("footwork"); expect(offered).toContain("routine_plays"); expect(offered).not.toContain("double_play");
    });
  }
});