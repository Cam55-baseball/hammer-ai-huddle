import { describe, it, expect } from "vitest";
import {
  computePopTimeGrade,
  CATCHER_POP_TIME_METRIC,
  type ScaleReferenceRow,
} from "@/lib/catching/popTimeGrade";
import { rawToGrade } from "@/lib/gradeEngine";

/**
 * Pop time is owned by `GRADE_BENCHMARKS.pop_time` (MLB Statcast sourced).
 * The `scale_reference` row is still loaded — its presence is what tells us
 * the athlete's sport has anchors at all — but it no longer supplies numbers.
 */
const SCALE: ScaleReferenceRow[] = [
  {
    metric: CATCHER_POP_TIME_METRIC,
    direction: "lower_better",
    floor_value: 2.15,
    avg_value: 2.02,
    record_value: 1.9,
  },
];

describe("computePopTimeGrade", () => {
  it("agrees exactly with the combine surface", () => {
    for (const t of [1.7, 1.83, 1.93, 2.05, 2.2]) {
      expect(computePopTimeGrade(t, SCALE).grade).toBe(
        rawToGrade("pop_time", t, "baseball", 25),
      );
    }
  });

  it("grades the pro anchors — Baseball Savant, 2026", () => {
    expect(computePopTimeGrade(1.6, SCALE)).toEqual({ grade: 80, missing: false });
    expect(computePopTimeGrade(2.0, SCALE)).toEqual({ grade: 45, missing: false });
    expect(computePopTimeGrade(2.5, SCALE)).toEqual({ grade: 20, missing: false });
  });

  it("clamps beyond the anchors instead of extrapolating", () => {
    expect(computePopTimeGrade(1.5, SCALE).grade).toBe(80);
    expect(computePopTimeGrade(2.8, SCALE).grade).toBe(20);
  });





  it("stays inside 20-80", () => {
    for (const t of [1.8, 1.93, 1.99, 2.05, 2.11, 2.3]) {
      const g = computePopTimeGrade(t, SCALE).grade!;
      expect(g).toBeGreaterThanOrEqual(20);
      expect(g).toBeLessThanOrEqual(80);
    }
  });

  it("is monotonic — faster pop times never grade lower", () => {
    const times = [2.3, 2.15, 2.08, 2.02, 1.97, 1.9];
    const grades = times.map((t) => computePopTimeGrade(t, SCALE).grade!);
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]).toBeGreaterThanOrEqual(grades[i - 1]);
    }
  });

  it("returns missing for absent or unusable values instead of fabricating", () => {
    expect(computePopTimeGrade(null, SCALE)).toMatchObject({
      grade: null,
      missing: true,
      missing_reason: "no_play_time",
    });
    expect(computePopTimeGrade(0, SCALE)).toMatchObject({ missing: true });
    expect(computePopTimeGrade(Number.NaN, SCALE)).toMatchObject({ missing: true });
  });

  it("returns missing when the athlete's sport has no anchors", () => {
    expect(computePopTimeGrade(2.0, [])).toMatchObject({
      missing: true,
      missing_reason: "no_scale_reference",
    });
  });
});
