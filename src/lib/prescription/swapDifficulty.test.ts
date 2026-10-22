import { describe, expect, it } from "vitest";
import { swapChoices, isDifficultyJump, difficultyLevel } from "../../../supabase/functions/_shared/planSwap/simpleSwap";

const base = { is_active: true, superseded_by: null, movement_category: "core", substitution_family: "carry",
  primary_adaptation: "anti_rotation", dosage_unit: "reps", sport_scope: "both", equipment_requirements: [] as string[] };
const all = { beginner: true, developing: true };
// Real catalog values (Oct 22): dead-bug cost 1 open to beginners; dragon flag cost 2, beginners closed.
const deadbug = { ...base, slug: "lift_deadbug_band_press", name: "Dead-Bug + Band Press", cns_cost: 1, training_age_legality: all, movement_pattern: "carry_antirotation" };
const dragon = { ...base, slug: "lift_dragon_flag_prog", name: "Dragon Flag Progression", cns_cost: 2, training_age_legality: { beginner: false }, movement_pattern: "carry_antirotation" };
const pallof = { ...base, slug: "pallof", name: "Pallof Press", cns_cost: 1, training_age_legality: all, movement_pattern: "carry_antirotation" };
const harderOther = { ...base, slug: "a_other", name: "Other", cns_cost: 2, training_age_legality: all, movement_pattern: "rotation" };
const rx = { sets: 1, reps: 8, total_reps: 8, dosage_unit: "reps" };
const p = { phase: "os_q1", sport: "baseball" as const, ageYears: 16, injuries: [] as string[], availableGear: [] as string[] };

describe("Swap difficulty", () => {
  it("rates dragon flag two levels above dead-bug", () => {
    expect(difficultyLevel(deadbug)).toBe(1);
    expect(difficultyLevel(dragon)).toBe(3);
    expect(isDifficultyJump(deadbug, dragon)).toBe(true);
  });
  it("never offers dead-bug → dragon flag", () => {
    expect(swapChoices(deadbug, [dragon, pallof], rx, [], p).map(c => c.slug)).toEqual(["pallof"]);
  });
  it("puts same-family, same-level choices before harder ones", () => {
    expect(swapChoices(deadbug, [harderOther, pallof], rx, [], p).map(c => c.slug)).toEqual(["pallof", "a_other"]);
  });
});
