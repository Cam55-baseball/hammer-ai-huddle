import { describe, expect, it } from "vitest";
import { hasSwapRequirements, previewUniversalSwap, type UniversalSwapMovement, type UniversalSwapContext } from "./universalSwapCandidates";
import type { SwapDose } from "./sameDoseSwap";

const dose: SwapDose = { sets: 3, reps: 10, duration_seconds: null, distance_feet: null,
  total_reps: 30, dosage_unit: "reps", tempo: null, load_pct: null };
const row: UniversalSwapMovement = { slug: "machine", name: "Angled machine fastballs", is_active: true,
  movement_category: "hitting", substitution_family: "timing", primary_adaptation: "ball_timing",
  dosage_unit: "reps", equipment_requirements: ["pitching_machine"], min_age_years: 13,
  contraindications: [], sport_scope: "baseball", season_legality: { os_q1: true }, training_age_legality: { beginner: true } };
const context: UniversalSwapContext = { category: "hitting", phase: "os_q1", trainingAge: "beginner",
  sport: "baseball", ageYears: 16, injuryRestrictions: [], sessionAllowed: true,
  availability: { confirmed: true, have: ["partner", "screen", "ball", "net"], lacks: ["pitching_machine"] } };
const flips = { ...row, slug: "flips", name: "Partner front toss flips", equipment_requirements: ["partner", "screen", "ball", "net"] };
describe("universal Swap catalog preview", () => {
  it("machine to partner flips keeps all 30 reps and every dose field", () => {
    const result = previewUniversalSwap(row, dose, [flips], context);
    expect(result.candidates.map(value => value.movement.slug)).toEqual(["flips"]);
    expect(result.candidates[0].dose).toEqual(dose);
    expect(result.candidates[0].dose.total_reps).toBe(30);
  });
  it("no-barbell lift uses confirmed dumbbells without changing reps, tempo or load", () => {
    const lift = { ...row, slug: "barbell", movement_category: "single_leg", substitution_family: "lunge", primary_adaptation: "strength", equipment_requirements: ["barbell"] };
    const candidate = { ...lift, slug: "db_lunge", equipment_requirements: ["db"] };
    const liftDose = { ...dose, reps: 6, total_reps: 18, tempo: "controlled", load_pct: 65 };
    const result = previewUniversalSwap(lift, liftDose, [candidate], { ...context, category: "single_leg", availability: { confirmed: true, have: ["dumbbells"], lacks: ["barbell"] } });
    expect(result.candidates[0].dose).toEqual(liftDose);
  });
  it("no open field cannot turn a 30-yard sprint into marches or a guessed hallway run", () => {
    const sprint = { ...row, slug: "sprint", movement_category: "speed", substitution_family: "acceleration", primary_adaptation: "acceleration", dosage_unit: "feet", equipment_requirements: ["open_space"] };
    const runningDose = { ...dose, reps: null, total_reps: null, distance_feet: 90, dosage_unit: "feet" };
    const march = { ...sprint, slug: "march", dosage_unit: "seconds", equipment_requirements: [] };
    const hall = { ...sprint, slug: "hall", equipment_requirements: ["safe_30_yard_runway"] };
    expect(previewUniversalSwap(sprint, runningDose, [march, hall], { ...context, category: "speed", availability: { confirmed: true, have: [], lacks: ["open_space"] } }).candidates).toEqual([]);
    const checked = previewUniversalSwap(sprint, runningDose, [hall], { ...context, category: "speed", availability: { confirmed: true, have: ["safe_30_yard_runway"], lacks: ["open_space"] } });
    expect(checked.candidates[0].dose.distance_feet).toBe(90);
  });
  it("no foam roller permits only an explicitly equal recovery intent and duration", () => {
    const recovery = { ...row, slug: "roller", movement_category: "recovery", substitution_family: "calf_release", primary_adaptation: "calf_release", dosage_unit: "seconds", equipment_requirements: ["foam_roller"] };
    const ball = { ...recovery, slug: "massage_ball", equipment_requirements: ["lacrosse_ball"] };
    const stretch = { ...ball, slug: "stretch", primary_adaptation: "calf_flexibility", equipment_requirements: [] };
    const recoveryDose = { ...dose, reps: null, total_reps: null, duration_seconds: 60, dosage_unit: "seconds" };
    const result = previewUniversalSwap(recovery, recoveryDose, [ball, stretch], { ...context, category: "recovery", availability: { confirmed: true, have: ["lacrosse_ball"], lacks: ["foam_roller"] } });
    expect(result.candidates.map(value => value.movement.slug)).toEqual(["massage_ball"]);
    expect(result.candidates[0].dose.duration_seconds).toBe(60);
  });
  it("missing intent, injury answer, age, availability or stopped session fails closed", () => {
    for (const patch of [{ injuryRestrictions: null }, { ageYears: null }, { sessionAllowed: false }, { availability: { ...context.availability, confirmed: false } }]) {
      expect(previewUniversalSwap(row, dose, [flips], { ...context, ...patch }).blocked).toBe(true);
    }
    expect(previewUniversalSwap({ ...row, primary_adaptation: null }, dose, [flips], context).blocked).toBe(true);
  });
  it("same-family different intent, category, sport, injury, age and duplicate identity are refused", () => {
    for (const patch of [{ primary_adaptation: "swing_plane" }, { movement_category: "pitching" }, { sport_scope: "softball" }, { min_age_years: 18 }, { contraindications: ["shoulder"] }, { equipment_requirements: null }]) {
      expect(previewUniversalSwap(row, dose, [{ ...flips, ...patch }], { ...context, injuryRestrictions: ["shoulder"] }).candidates).toEqual([]);
    }
    expect(previewUniversalSwap(row, dose, [flips, { ...flips }], context).candidates).toEqual([]);
  });
  it("space, wall, bench, partner and equipment are not implied by bodyweight or equipment tier", () => {
    for (const token of ["open_space", "wall", "bench", "partner", "dumbbell", "unknown_device"]) {
      expect(hasSwapRequirements([token], { confirmed: true, have: ["bodyweight", "barbell"], lacks: [] })).toBe(false);
    }
    expect(hasSwapRequirements(["db"], { confirmed: true, have: ["dumbbells"], lacks: ["dumbbell"] })).toBe(false);
    expect(hasSwapRequirements([], { confirmed: true, have: [], lacks: [] })).toBe(true);
  });
});