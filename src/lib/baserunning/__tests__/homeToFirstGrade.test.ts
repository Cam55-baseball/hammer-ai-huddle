import { describe, it, expect } from "vitest";
import {
  computeHomeToFirstGrade,
  homeToFirstMetric,
  type ScaleReferenceRow,
} from "@/lib/baserunning/homeToFirstGrade";

// Mirrors the seeded rows in scale_reference (sport = baseball).
const ROWS: ScaleReferenceRow[] = [
  { metric: "home_to_first_rhh", direction: "lower_better", floor_value: 4.6, avg_value: 4.3, record_value: 4.0 },
  { metric: "home_to_first_lhh", direction: "lower_better", floor_value: 4.5, avg_value: 4.2, record_value: 3.9 },
];

describe("homeToFirstMetric", () => {
  it("maps handedness to the seeded metric names", () => {
    expect(homeToFirstMetric("R")).toBe("home_to_first_rhh");
    expect(homeToFirstMetric("L")).toBe("home_to_first_lhh");
  });
});

describe("computeHomeToFirstGrade", () => {
  it("returns 50 at the average split", () => {
    expect(computeHomeToFirstGrade(4.3, "R", ROWS)).toEqual({ grade: 50, missing: false });
    expect(computeHomeToFirstGrade(4.2, "L", ROWS)).toEqual({ grade: 50, missing: false });
  });

  it("caps at 80 at or below the record split", () => {
    expect(computeHomeToFirstGrade(4.0, "R", ROWS).grade).toBe(80);
    expect(computeHomeToFirstGrade(3.5, "L", ROWS).grade).toBe(80);
  });

  it("floors at 20 for slow splits", () => {
    expect(computeHomeToFirstGrade(6.0, "R", ROWS).grade).toBe(20);
  });

  it("interpolates between anchors", () => {
    expect(computeHomeToFirstGrade(4.1, "R", ROWS).grade).toBe(70);
    expect(computeHomeToFirstGrade(4.1, "L", ROWS).grade).toBe(60);
    expect(computeHomeToFirstGrade(4.45, "R", ROWS).grade).toBe(35);
  });

  it("is handedness sensitive", () => {
    expect(computeHomeToFirstGrade(4.15, "R", ROWS).grade!).toBeGreaterThan(
      computeHomeToFirstGrade(4.15, "L", ROWS).grade!,
    );
  });

  it("returns grades on the 5-point scouting grid", () => {
    for (let t = 3.8; t <= 4.8; t += 0.03) {
      expect(computeHomeToFirstGrade(t, "R", ROWS).grade! % 5).toBe(0);
    }
  });

  it("never fabricates a grade for absent or invalid values", () => {
    for (const v of [null, undefined, 0, -2, Number.NaN]) {
      expect(computeHomeToFirstGrade(v as number | null, "R", ROWS)).toEqual({
        grade: null,
        missing: true,
        missing_reason: "no_play_time",
      });
    }
  });

  it("reports missing when the reference anchors are absent or unusable", () => {
    expect(computeHomeToFirstGrade(4.1, "R", [])).toMatchObject({ missing_reason: "no_scale_reference" });
    expect(
      computeHomeToFirstGrade(4.1, "R", [{ ...ROWS[0], floor_value: null }]),
    ).toMatchObject({ missing_reason: "incomplete_scale_reference" });
    expect(
      computeHomeToFirstGrade(4.1, "R", [{ ...ROWS[0], direction: "higher_better" }]),
    ).toMatchObject({ missing_reason: "unsupported_direction" });
  });

  it("is monotonic — faster splits never grade lower", () => {
    let prev = -Infinity;
    for (let t = 5.0; t >= 3.5; t -= 0.05) {
      const g = computeHomeToFirstGrade(t, "L", ROWS).grade!;
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });
});
