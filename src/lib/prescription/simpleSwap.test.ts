import { describe, expect, it } from "vitest";
import { swapChoices, qualifies } from "../../../supabase/functions/_shared/planSwap/simpleSwap";

const src = { slug: "machine", name: "Machine", is_active: true, superseded_by: null, movement_category: "hitting",
  substitution_family: "timing", primary_adaptation: "ball_timing", dosage_unit: "reps", equipment_requirements: ["pitching_machine"] };
const flips = { ...src, slug: "flips", name: "Partner flips", equipment_requirements: ["partner"] };
const rx = { sets: 3, reps: 10, total_reps: 30, dosage_unit: "reps" };
const p = { phase: "os_q1", ageYears: 15, injuries: [] as string[] };

describe("simple Swap", () => {
  it("machine → partner flips keeps the same 30 swings", () => {
    expect(swapChoices(src, [src, flips], rx, ["pitching_machine"], p)[0].reason).toBe("Partner flips: same 30 reps, no pitching machine needed");
  });
  it("refuses a choice that needs the missing item", () => {
    expect(qualifies(src, { ...flips, equipment_requirements: ["pitching_machine"] }, ["pitching_machine"], p)).toBe(false);
  });
  it("refuses a different intent or unit", () => {
    expect(qualifies(src, { ...flips, primary_adaptation: "power" }, [], p)).toBe(false);
    expect(qualifies(src, { ...flips, dosage_unit: "seconds" }, [], p)).toBe(false);
  });
  it("refuses under-age and injury conflicts", () => {
    expect(qualifies(src, { ...flips, min_age_years: 16 }, [], p)).toBe(false);
    expect(qualifies(src, { ...flips, contraindications: ["shoulder"] }, [], { ...p, injuries: ["shoulder"] })).toBe(false);
  });
  it("never allows eccentric overload in season", () => {
    expect(qualifies(src, { ...flips, eccentric_overload: true }, [], { ...p, phase: "in_season" })).toBe(false);
  });
});
