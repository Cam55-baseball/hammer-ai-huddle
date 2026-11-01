import { describe, expect, it } from "vitest";
import { applyGreenlightPlan } from "../greenlightPlan";
import { greenlightLevel, greenlightFraction } from "../../../../../supabase/functions/_shared/wic/progression/greenlight";

const block = (modality: string, status = "ready") => ({
  modality, status, title: "x", why: "", roadmapReason: "", phase: "build", steps: [], cues: [], stopRules: [],
  durationMin: 20, route: "/", ctaLabel: "", missing: [], missingContextKeys: [], gamePlanTemplate: null,
  drills: [
    { name: "Prep", dosage: "2 x 10", stage: "prep" },
    { name: "Tee", dosage: "6 x 8 swings" },
    { name: "Full go", dosage: "4 x 5", stage: "full_go" },
  ],
}) as any;

describe("greenlight on Today cards", () => {
  it("no starting point = written dose unchanged", () => {
    const out = applyGreenlightPlan([block("hitting")], { hitting: greenlightLevel("hitting", ["green"], 22) }, null);
    expect(out[0].drills[1].dosage).toBe("6 x 8 swings");
  });
  it("easing back in (50%) halves drill sets only; prep and full-go untouched", () => {
    const out = applyGreenlightPlan([block("hitting")], {}, { hitting: 0.5 });
    expect(out[0].drills.map((d: any) => d.dosage)).toEqual(["2 x 10", "3 x 8 swings", "4 x 5"]);
    expect(out[0].because?.some((b: string) => /about 50%/.test(b))).toBe(true);
  });
  it("green weeks step the share up, never above the written dose", () => {
    expect(greenlightFraction("hitting", 0.5, 1)).toBeCloseTo(0.53);
    expect(greenlightFraction("hitting", 0.9, 10)).toBe(1);
  });
  it("throwing, recovery and non-ready cards are never touched", () => {
    for (const b of [block("throwing"), block("recovery"), block("hitting", "rest")])
      expect(applyGreenlightPlan([b], {}, { hitting: 0.5, throwing: 0.5 } as any)[0]).toBe(b);
  });
  it("never below 1 set", () => {
    const b = { ...block("speed"), drills: [{ name: "Sprint", dosage: "1 x 3" }] };
    expect(applyGreenlightPlan([b], {}, { speed: 0.1 })[0].drills[0].dosage).toBe("1 x 3");
  });
});
