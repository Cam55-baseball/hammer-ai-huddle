import { describe, it, expect } from "vitest";
import { fullBodyTemplate, FULL_BODY_CORE } from "./warmupLibrary";
const TRAINING = ["game_day","in_season_practice","in_season_default","speed_day","lift_day","throwing_day","hitting_day","offseason_extended","travel_day","default"] as const;
describe("Full-body warm-up every training day (owner Oct 30)", () => {
  for (const ctx of TRAINING) {
    it(`${ctx} has every full-body stage in order, and no breathing`, () => {
      const t = fullBodyTemplate(ctx);
      for (const r of FULL_BODY_CORE) expect(t).toContain(r);
      expect(t.indexOf("tissue_prep")).toBeLessThan(t.indexOf("mobility_joint"));
      expect(t.indexOf("mobility_joint")).toBeLessThan(t.indexOf("activation"));
      expect(t).not.toContain("breathwork");
    });
  }
  it("speed day keeps its sprint-specific prep on top of the full body", () => {
    const t = fullBodyTemplate("speed_day");
    expect(t).toContain("fascial_rotation");
    expect(t).toContain("ground_force");
  });
});
