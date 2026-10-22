import { describe, expect, it } from "vitest";
import { swapChoices, qualifies, swapMemoryAnswer, avoidsMissingGear } from "../../../supabase/functions/_shared/planSwap/simpleSwap";

const src = { slug: "machine", name: "Machine", is_active: true, superseded_by: null, movement_category: "hitting",
  substitution_family: "timing", primary_adaptation: "ball_timing", dosage_unit: "reps", equipment_requirements: ["pitching_machine"] };
const flips = { ...src, slug: "flips", name: "Partner flips", equipment_requirements: ["partner"] };
const rx = { sets: 3, reps: 10, total_reps: 30, dosage_unit: "reps" };
const p = { phase: "os_q1", ageYears: 15, injuries: [] as string[], availableGear: ["partner"] };

describe("simple Swap", () => {
  it("records missing machine equipment for today without making it permanent", () => {
    expect(swapMemoryAnswer("player", "request", "2026-10-22", "today", ["pitching_machine"]))
      .toEqual({ user_id: "player", request_id: "request", plan_date: "2026-10-22", scope: "today", confirmed_have: [], confirmed_lacks: ["pitching_machine"] });
  });
  it("records no-barbell Always answers for later plan builds", () => {
    expect(swapMemoryAnswer("player", "request", "2026-10-22", "always", ["barbell"]))
      .toEqual({ user_id: "player", request_id: "request", plan_date: "2026-10-22", scope: "always", confirmed_have: [], confirmed_lacks: ["barbell"] });
  });
  it("machine → partner flips keeps the same 30 swings", () => {
    expect(swapChoices(src, [src, flips], rx, ["pitching_machine"], p)[0].reason).toBe("Partner flips: same 30 reps, no pitching machine needed");
  });
  it("does not invent an available partner for machine to flips", () => {
    expect(swapChoices(src, [src, flips], rx, ["pitching_machine"], { ...p, availableGear: [] })).toEqual([]);
  });
  it("requires every replacement item, including its safe space", () => {
    expect(qualifies(src, { ...flips, equipment_requirements: ["partner", "field"] }, [], p)).toBe(false);
  });
  it("accepts the saved cable-machine alias without assuming other gear", () => {
    expect(qualifies(src, { ...flips, equipment_requirements: ["cable"] }, [], { ...p, availableGear: ["cable_stack"] })).toBe(true);
  });
  it("Always no barbell excludes a barbell row even when no family fallback exists", () => {
    expect(avoidsMissingGear({ equipment_requirements: ["barbell"], substitution_family: null }, ["barbell"])).toBe(false);
    expect(avoidsMissingGear({ equipment_requirements: ["bodyweight"] }, ["barbell"])).toBe(true);
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
