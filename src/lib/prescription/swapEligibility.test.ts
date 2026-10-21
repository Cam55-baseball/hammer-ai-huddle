import { describe, expect, it } from "vitest";
import { eligibleSwapCandidate, type SwapEligibilityFacts } from "./swapEligibility";
const source: SwapEligibilityFacts = { slug: "squat", is_active: true, movement_category: "squat",
  substitution_family: "squat", dosage_unit: "reps", season_legality: { os_q1: true, in_season: true, post_season: true },
  training_age_legality: { beginner: true }, min_age_years: 13, equipment_requirements: ["barbell"] };
const target = { ...source, slug: "goblet", equipment_requirements: ["db"] };
const context = { category: "squat", unit: "reps", phase: "os_q1", trainingAge: "beginner" };
describe("Swap display eligibility", () => {
  it("permits same-family, same-unit lower-risk work with explicit legality", () => expect(eligibleSwapCandidate(source, target, context)).toBe(true));
  it("never spills into another category or an unrelated same-category intent", () => {
    expect(eligibleSwapCandidate(source, { ...target, movement_category: "carry" }, context)).toBe(false);
    expect(eligibleSwapCandidate(source, { ...target, substitution_family: "other" }, context)).toBe(false);
    expect(eligibleSwapCandidate({ ...source, substitution_family: null }, { ...target, substitution_family: null }, context)).toBe(false);
  });
  it("requires active catalog and explicit training-age legality, not missing permissions", () => {
    expect(eligibleSwapCandidate(source, { ...target, is_active: false }, context)).toBe(false);
    expect(eligibleSwapCandidate(source, { ...target, training_age_legality: null }, context)).toBe(false);
    expect(eligibleSwapCandidate(source, { ...target, training_age_legality: { beginner: false } }, context)).toBe(false);
    expect(eligibleSwapCandidate(source, target, { ...context, trainingAge: null })).toBe(false);
  });
  it("competitive phases never allow eccentric overload despite catalog permissions", () => {
    for (const phase of ["in_season", "post_season"]) {
      expect(eligibleSwapCandidate({ ...source, eccentric_overload: true }, { ...target, eccentric_overload: true }, { ...context, phase })).toBe(false);
    }
  });
  it("honors the full season gate, including blocked deep-flexion families", () => {
    expect(eligibleSwapCandidate(source, { ...target, slug: "nordic_curl" }, { ...context, phase: "in_season" })).toBe(false);
    expect(eligibleSwapCandidate({ ...source, substitution_family: "atg_split_squat" },
      { ...target, substitution_family: "atg_split_squat" }, { ...context, phase: "in_season" })).toBe(false);
  });
  it("never changes distance work to timed work even for an approved equivalent", () => {
    expect(eligibleSwapCandidate(source, { ...target, dosage_unit: "seconds" }, { ...context, unit: "feet", approvedEquivalent: true })).toBe(false);
  });
});