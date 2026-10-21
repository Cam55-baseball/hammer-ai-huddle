import { describe, expect, it } from "vitest";
import { recordedSwapDose, sameDoseSwap, type SwapDose } from "./sameDoseSwap";

const dose: SwapDose = { sets: 4, reps: 5, duration_seconds: null, distance_feet: null,
  total_reps: 20, dosage_unit: "reps", tempo: "3010", load_pct: 70 };
describe("owner exact-dose substitution", () => {
  it("keeps all sets, reps, tempo and loading rather than reducing for missing equipment or time", () => {
    expect(sameDoseSwap(dose, { dosage_unit: "reps" })).toEqual(dose);
  });
  it("rejects reps-to-seconds rather than inventing an equivalent dose", () => {
    expect(() => sameDoseSwap(dose, { dosage_unit: "seconds" })).toThrow();
  });
  it("keeps sprint sets, distance and total work unchanged", () => {
    const sprint = { ...dose, reps: null, distance_feet: 90, dosage_unit: "feet", load_pct: null };
    expect(sameDoseSwap(sprint, { dosage_unit: "feet" })).toEqual(sprint);
  });
  it("rejects unknown source and candidate units", () => {
    expect(() => sameDoseSwap({ ...dose, dosage_unit: null }, { dosage_unit: "reps" })).toThrow();
    expect(() => sameDoseSwap(dose, { dosage_unit: null })).toThrow();
  });
  it('undo restores explicitly null fields exactly, never catalog defaults', () => {
    expect(recordedSwapDose(dose)).toEqual(dose);
    expect(recordedSwapDose({ ...dose, reps: null, tempo: null, load_pct: null })).toEqual({ ...dose, reps: null, tempo: null, load_pct: null });
  });
  it('undo refuses an incomplete receipt rather than inventing its original dose', () => {
    const { duration_seconds, ...incomplete } = dose;
    expect(duration_seconds).toBeNull();
    expect(() => recordedSwapDose(incomplete)).toThrow();
    expect(() => recordedSwapDose(null)).toThrow();
  });
});