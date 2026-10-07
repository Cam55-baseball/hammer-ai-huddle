import { describe, it, expect } from "vitest";
import { isSameOrLowerRisk, loadTier } from "@/lib/prescription/alternativeRisk";

describe("Alternative button — same or lower risk", () => {
  const backSquat = { min_age_years: 14, plyo_tier: 0, equipment_requirements: ["barbell", "rack"], contraindications: ["knee_acute"] };
  it("busy gym: barbell squat → trap bar or goblet allowed, never harder", () => {
    expect(isSameOrLowerRisk(backSquat, { min_age_years: 13, equipment_requirements: ["trap_bar"], contraindications: [] })).toBe(true);
    expect(isSameOrLowerRisk(backSquat, { min_age_years: 12, equipment_requirements: ["db"] })).toBe(true);
    expect(isSameOrLowerRisk({ ...backSquat, equipment_requirements: ["db"] }, { equipment_requirements: ["barbell"] })).toBe(false);
  });
  it("never older age, higher plyo, eccentric overload or a new injury flag", () => {
    expect(isSameOrLowerRisk(backSquat, { min_age_years: 16 })).toBe(false);
    expect(isSameOrLowerRisk(backSquat, { plyo_tier: 2 })).toBe(false);
    expect(isSameOrLowerRisk(backSquat, { eccentric_overload: true })).toBe(false);
    expect(isSameOrLowerRisk(backSquat, { contraindications: ["low_back"] })).toBe(false);
  });
  it("load tiers", () => {
    expect(loadTier(["barbell"])).toBe(3); expect(loadTier(["trap_bar"])).toBe(2); expect(loadTier(["kb"])).toBe(1); expect(loadTier([])).toBe(0);
  });
});
import { describe, it, expect } from "vitest"; import { isSameOrLowerRisk } from "@/lib/prescription/alternativeRisk";
describe("ub tier strings", () => { it("U3 never replaces U1", () => { expect(isSameOrLowerRisk({ ub_tier: "U1" }, { ub_tier: "U3" })).toBe(false); expect(isSameOrLowerRisk({ ub_tier: "U3" }, { ub_tier: "U1" })).toBe(true); }); });
