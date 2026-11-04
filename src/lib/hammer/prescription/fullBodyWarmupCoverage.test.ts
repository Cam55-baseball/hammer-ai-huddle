import { describe, it, expect } from "vitest";
import { buildWarmup, warmupCoverageIssues, type WarmupContext } from "./warmupLibrary";
const TRAINING: WarmupContext[] = ["game_day","in_season_practice","in_season_default","speed_day","lift_day","throwing_day","hitting_day","offseason_extended","travel_day","default"];
const LIFE = ["youth","beginner","intermediate","advanced","elite"] as const;
describe("Dominant full-body warm-up (owner Nov 4 r2 #5)", () => {
  for (const context of TRAINING) for (const lifecycle of LIFE) {
    it(`${context}/${lifecycle}: ≥2 arm prep, ≥2 hitting readiness, lower + hip/core + upper`, () => {
      for (let seed = 0; seed < 8; seed++) {
        const w = buildWarmup({ context, lifecycle, gameDay: context === "game_day", daySeed: seed, equipment: [], suppressArmCare: context === "throwing_day" });
        expect(warmupCoverageIssues(w.drills)).toEqual([]);
      }
    });
  }
  it("adds emphasis: more arm prep on throwing days, more rotation on hitting days", () => {
    const t = buildWarmup({ context: "throwing_day", lifecycle: "advanced", gameDay: false, equipment: [] }).drills;
    const h = buildWarmup({ context: "hitting_day", lifecycle: "advanced", gameDay: false, equipment: [] }).drills;
    expect(t.filter(d => d.role === "arm_prep").length).toBeGreaterThanOrEqual(3);
    expect(h.filter(d => d.role === "hitting_prep").length).toBeGreaterThanOrEqual(3);
  });
  it("an injured shoulder or back swaps to safe versions and never drops coverage", () => {
    for (const regions of [["shoulder"], ["back"], ["shoulder", "back", "elbow"]]) {
      const w = buildWarmup({ context: "default", lifecycle: "advanced", gameDay: false, equipment: [], injuryRegions: regions });
      expect(warmupCoverageIssues(w.drills)).toEqual([]);
    }
  });
  it("the validator flags a leg-heavy warm-up", () => {
    expect(warmupCoverageIssues([{ role: "tissue_prep" }, { role: "single_leg_twitch" }, { role: "ladder_quickness" }])).toEqual(expect.arrayContaining(["warmup_arm_prep_short:0", "warmup_hitting_prep_short:0", "warmup_no_upper", "warmup_no_hip_core"]));
  });
});
