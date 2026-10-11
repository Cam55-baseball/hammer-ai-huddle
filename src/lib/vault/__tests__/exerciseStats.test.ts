import { describe, it, expect } from "vitest";
import { computeExerciseStats } from "../../../../supabase/functions/_shared/vault/exerciseStats";

describe("vault stats panel", () => {
  it("completion rate counts completed vs missed, not planned", () => {
    const s = computeExerciseStats({ prescriptions: [{ status: "completed" }, { status: "completed" }, { status: "completed" }, { status: "missed" }, { status: "planned" }], logs: [], anon: [] });
    expect(s.timesPrescribed).toBe(5);
    expect(s.completionRate).toBe(75);
  });
  it("averages effort 1–10 and primer quality 1–5, ignoring out-of-range values", () => {
    const s = computeExerciseStats({ prescriptions: [], anon: [], logs: [{ rpe: 6, metrics: null }, { rpe: 8, metrics: { quality: 4 } }, { rpe: 14, metrics: { quality: 5 } }, { rpe: null, metrics: { quality: 9 } }] });
    expect(s.averageEffort).toBe(7);
    expect(s.averagePrimerQuality).toBe(4.5);
  });
  it("shows nothing rather than inventing a value when there is no data", () => {
    const s = computeExerciseStats({ prescriptions: [], logs: [], anon: [] });
    expect(s.completionRate).toBeNull();
    expect(s.averageEffort).toBeNull();
    expect(s.performanceChange.w4).toBeNull();
  });
});
