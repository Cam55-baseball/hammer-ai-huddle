import { describe, it, expect } from "vitest";
import { resolveGoalEmphasis, careerDirection, MAX_WEIGHT, MIN_WEIGHT, BASELINE_WEIGHT } from "../../supabase/functions/_shared/wic/goals/emphasis";
import { normalizeCategoryGoalsV2, normalizeCategoryOrder } from "@/lib/hammer/goals/categoryGoals";

describe("Stage 5 — career goal tilts, never entitles", () => {
  it("no goal, no ranking → every area at baseline (current behaviour)", () => {
    const e = resolveGoalEmphasis({});
    expect(e.isBaselineOnly).toBe(true);
    expect(Object.values(e.weights).every((w) => w === BASELINE_WEIGHT)).toBe(true);
  });
  it("exit-velocity hitter tilts hitting and power", () => {
    expect(careerDirection("I want to hit more homeruns than strikeouts")).toEqual(["hitting", "power"]);
    const e = resolveGoalEmphasis({ careerGoal: "Gain more power in my swing" });
    expect(e.weights.hitting).toBeGreaterThan(BASELINE_WEIGHT);
    expect(e.weights.speed).toBeLessThan(BASELINE_WEIGHT);
  });
  it("pitcher chasing command tilts throwing", () => {
    expect(careerDirection("Better command, throw more strikes", true)).toEqual(["throwing"]);
  });
  it("a roster-spot goal names no area → no tilt, said plainly", () => {
    expect(careerDirection("Make varsity and earn a roster spot")).toEqual([]);
    expect(resolveGoalEmphasis({ careerGoal: "Make varsity" }).isBaselineOnly).toBe(true);
  });
  it("career tilt is smaller than a ranked goal and stays inside the bounds", () => {
    const e = resolveGoalEmphasis({ careerGoal: "hit more home runs", categoryOrder: ["speed", "fielding", "throwing", "power", "hitting"] });
    expect(e.weights.speed).toBeGreaterThan(e.weights.hitting - 0.01);
    for (const w of Object.values(e.weights)) { expect(w).toBeLessThanOrEqual(MAX_WEIGHT); expect(w).toBeGreaterThanOrEqual(MIN_WEIGHT); }
  });
  it("the athlete's own ranking sets the order", () => {
    const e = resolveGoalEmphasis({ categoryOrder: ["fielding", "speed", "hitting", "power", "throwing"] });
    expect(e.athleteRanked).toBe(true);
    expect(e.ranked[0]).toBe("fielding");
    expect(e.weights.fielding).toBeGreaterThan(e.weights.throwing);
  });
  it("incomplete ranking is ignored", () => {
    expect(resolveGoalEmphasis({ categoryOrder: ["fielding"] }).athleteRanked).toBe(false);
    expect(normalizeCategoryOrder(["hitting", "hitting", "power"])).toBeNull();
  });
  it("saved ranking survives the goals editor's normalisation", () => {
    const order = ["hitting", "power", "speed", "fielding", "throwing"];
    const v2 = normalizeCategoryGoalsV2({ version: 2, baseball: { position: { hitting: [{ id: "barrel_control", rank: "primary" }] } }, categoryOrder: order });
    expect(v2?.categoryOrder).toEqual(order);
  });
});
