import { describe, it, expect } from "vitest";
import {
  computePopTimeGrade,
  CATCHER_POP_TIME_METRIC,
  type ScaleReferenceRow,
} from "@/lib/catching/popTimeGrade";

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
  it("grades the record anchor and anything faster at 80", () => {
    expect(computePopTimeGrade(1.9, SCALE)).toEqual({ grade: 80, missing: false });
    expect(computePopTimeGrade(1.75, SCALE)).toEqual({ grade: 80, missing: false });
  });

  it("grades the average anchor at 50", () => {
    expect(computePopTimeGrade(2.02, SCALE)).toEqual({ grade: 50, missing: false });
  });

  it("grades the floor anchor and anything slower at 20", () => {
    expect(computePopTimeGrade(2.15, SCALE)).toEqual({ grade: 20, missing: false });
    expect(computePopTimeGrade(2.6, SCALE)).toEqual({ grade: 20, missing: false });
  });

  it("interpolates between record and average", () => {
    // midway 1.96 → ~65
    expect(computePopTimeGrade(1.96, SCALE).grade).toBe(65);
  });

  it("interpolates between average and floor", () => {
    // midway 2.085 → ~35
    expect(computePopTimeGrade(2.085, SCALE).grade).toBe(35);
  });

  it("always returns a 5-point scouting grade inside 20-80", () => {
    for (const t of [1.8, 1.93, 1.99, 2.05, 2.11, 2.3]) {
      const g = computePopTimeGrade(t, SCALE).grade!;
      expect(g % 5).toBe(0);
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

  it("returns missing when the scale row is absent", () => {
    expect(computePopTimeGrade(2.0, [])).toMatchObject({
      missing: true,
      missing_reason: "no_scale_reference",
    });
  });

  it("returns missing when the scale row is incomplete or out of order", () => {
    expect(
      computePopTimeGrade(2.0, [{ ...SCALE[0], floor_value: null }]),
    ).toMatchObject({ missing: true, missing_reason: "incomplete_scale_reference" });
    expect(
      computePopTimeGrade(2.0, [{ ...SCALE[0], record_value: 2.5 }]),
    ).toMatchObject({ missing: true, missing_reason: "incomplete_scale_reference" });
  });

  it("refuses a direction it was not built for", () => {
    expect(
      computePopTimeGrade(2.0, [{ ...SCALE[0], direction: "sideways_better" }]),
    ).toMatchObject({ missing: true, missing_reason: "unsupported_direction" });
  });
});
