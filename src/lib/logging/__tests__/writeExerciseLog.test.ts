import { describe, expect, it } from "vitest";
import { buildExerciseLogRow } from "../writeExerciseLog";
describe("canonical hundredth-second exercise logging", () => {
  it("preserves the owner's 1.47-second entry without sending fractions to a legacy integer", () => {
    const row = buildExerciseLogRow("test-user", { prescription_id: "test-rx", plan_date: "2026-10-23", movement_slug: "hold", rounds: [{ time: 1.47 }] });
    expect(row.duration_seconds_precise).toBe(1.47);
    expect(row.metrics.rounds[0].time).toBe(1.47);
    expect(Number.isInteger(row.duration_seconds_completed)).toBe(true);
  });
  it("counts conditioning steps and time in canonical progress without converting either measure", () => {
    const rounds = [{ steps: 12, time: 1.47 }, { steps: 8, time: 2.36 }];
    const row = buildExerciseLogRow("test-user", { prescription_id: "test-rx", plan_date: "2026-10-27", movement_slug: "conditioning", rounds });
    expect(row.reps_completed).toEqual([12, 8]);
    expect(row.total_reps_completed).toBe(20);
    expect(row.duration_seconds_precise).toBe(3.83);
    expect(row.duration_seconds_completed).toBe(4);
    expect(row.metrics.rounds).toEqual(rounds);
  });
});