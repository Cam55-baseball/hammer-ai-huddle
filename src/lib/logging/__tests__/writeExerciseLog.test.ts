import { describe, expect, it } from "vitest";
import { buildExerciseLogRow } from "../writeExerciseLog";
describe("canonical hundredth-second exercise logging", () => {
  it("preserves the owner's 1.47-second entry without sending fractions to a legacy integer", () => {
    const row = buildExerciseLogRow("test-user", { prescription_id: "test-rx", plan_date: "2026-10-23", movement_slug: "hold", rounds: [{ time: 1.47 }] });
    expect(row.duration_seconds_precise).toBe(1.47);
    expect(row.metrics.rounds[0].time).toBe(1.47);
    expect(Number.isInteger(row.duration_seconds_completed)).toBe(true);
  });
});