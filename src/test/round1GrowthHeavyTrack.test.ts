import { describe, it, expect } from "vitest";
import { isHeavyEligible } from "../../supabase/functions/_shared/wic/dosage/methods";
import { planPowerPrimer, type PapInput } from "../../supabase/functions/_shared/wic/pap/powerPrimer";
import { goalDose, repCeiling } from "../../supabase/functions/_shared/wic/goals/goalDose";

const pap = (o: Partial<PapInput>): PapInput => ({
  sport: "baseball", role: "position", age: 16, growthMode: false, readiness: 80, pain: {},
  dayHas: { velocityThrow: false, batSpeed: false, hardRun: false }, gameTomorrow: false,
  daysSinceStart: null, daysUntilStart: null, realThrowDaysThisWeek: 0, realThrowsEnabled: false,
  goals: [], equipment: ["trap_bar", "db", "med_ball", "barbell", "pullup_bar", "band", "bat"],
  firstLift: { slug: "trap_bar_deadlift", name: "Trap bar deadlift", pattern: "hinge", heavy: true }, ...o,
});

describe("Round 1 F — growth on/off and the 16-year-old heavy track", () => {
  it("heavy track opens at 16 with 4+ training years, growth off, no pain", () => {
    expect(isHeavyEligible({ ageYears: 15, trainingAgeYears: 6 })).toBe(false);
    expect(isHeavyEligible({ ageYears: 16, trainingAgeYears: 3 })).toBe(false);
    expect(isHeavyEligible({ ageYears: 16, trainingAgeYears: 4 })).toBe(true);
    expect(isHeavyEligible({ ageYears: 16, trainingAgeYears: 4, growthMode: true })).toBe(false);
    expect(isHeavyEligible({ ageYears: 16, trainingAgeYears: 4, painFlag: true })).toBe(false);
  });

  it("85%+ loads: 15 never, 16 capped at 2 reps, adult with 4 years at 3", () => {
    expect(repCeiling(85, 15, 6)).toBeNull();
    expect(repCeiling(85, 16, 4)).toBe(2);
    expect(repCeiling(85, 18, 4)).toBe(3);
  });

  it("Power Primer: heavy primer only at 16+ with growth off; growth on = easy jumps only", () => {
    for (const age of [12, 14, 15]) expect(planPowerPrimer(pap({ age })).block?.primer.heavy ?? false).toBe(false);
    const on = planPowerPrimer(pap({ growthMode: true })).block;
    expect(on?.target).toBe("jump");
    expect(on?.primer.heavy ?? false).toBe(false);
    const off = planPowerPrimer(pap({ age: 16, growthMode: false })).block;
    expect(off).not.toBeNull();
  });

  it("goal table: growth on never adds sets; growth off may", () => {
    const base = { seasonPhase: "os_q1", key: "strength" as const, isDeloadWeek: false, trendLighter: false,
      role: "compound_lower", category: "main_compound", sets: 4, reps: 5, loadPct: 75, age: 17, trainingYears: 4 };
    const on = goalDose({ ...base, growthMode: true });
    expect((on?.sets ?? 4)).toBeLessThanOrEqual(4);
    const off = goalDose({ ...base, growthMode: false });
    expect((off?.sets ?? 4)).toBeGreaterThanOrEqual(4);
  });
});
