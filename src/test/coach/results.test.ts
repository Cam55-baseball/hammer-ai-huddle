import { describe, expect, it } from "vitest";
import { actualResultText, type WorkoutActual } from "@/lib/coachRx/results";
const base: WorkoutActual = { id: "log", plan_date: "2026-10-24", movement_slug: "catch", sets_completed: null, reps_completed: null, total_reps_completed: null, duration_seconds_precise: null, duration_seconds_completed: null, distance_feet_completed: null };
describe("canonical workout actuals", () => {
  it("keeps an entered 1.47 seconds instead of its whole-second projection", () => {
    expect(actualResultText({ ...base, duration_seconds_precise: 1.47, duration_seconds_completed: 1 })).toContain("1.47");
  });
  it("reports actual throws without manufacturing target reps", () => {
    expect(actualResultText({ ...base, reps_completed: [12, 8], prescription: { movement_name: "Catch", dosage_unit: "throws", slot: "throwing" } })).toContain("Throws: 12 / 8");
    expect(actualResultText(base)).toBe("No entered results");
  });
  it("keeps entered fielding throws separate from fielding reps", () => {
    expect(actualResultText({ ...base, reps_completed: [6], metrics: { rounds: [{ reps: 6, throws: 2 }] } })).toContain("Throws: 2");
  });
  it("reads actual hitting swings from the existing canonical rounds", () => {
    expect(actualResultText({ ...base, metrics: { rounds: [{ swings: 12 }, { swings: 8 }] } })).toContain("Swings: 12 / 8");
  });
  it("preserves each entered hundredth-second round instead of showing only their sum", () => {
    const result = actualResultText({ ...base, duration_seconds_precise: 3.05, metrics: { rounds: [{ time: 1.47 }, { duration: 1.58 }] } });
    expect(result).toContain("Round times: 1.47 / 1.58 s");
    expect(result).toContain("Time: 3.05 s");
  });
  it("shows each actual distance rather than presenting the maximum as every round", () => {
    expect(actualResultText({ ...base, distance_feet_completed: 45, metrics: { rounds: [{ distance: 30 }, { distance: 45 }] } })).toContain("Round distances: 30 / 45 ft");
  });
});