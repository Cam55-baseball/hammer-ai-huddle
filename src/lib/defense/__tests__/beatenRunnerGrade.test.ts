import { describe, it, expect } from "vitest";
import {
  computeBeatenRunnerGrade,
  metricForHandedness,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";

// Mirrors the seeded rows in scale_reference (sport = baseball).
const ROWS: ScaleReferenceRow[] = [
  {
    metric: "home_to_first_rhh",
    direction: "lower_better",
    floor_value: 4.6,
    avg_value: 4.3,
    record_value: 4.0,
  },
  {
    metric: "home_to_first_lhh",
    direction: "lower_better",
    floor_value: 4.5,
    avg_value: 4.2,
    record_value: 3.9,
  },
];

describe("metricForHandedness", () => {
  it("maps handedness to the seeded metric names", () => {
    expect(metricForHandedness("R")).toBe("home_to_first_rhh");
    expect(metricForHandedness("L")).toBe("home_to_first_lhh");
  });
});

describe("computeBeatenRunnerGrade", () => {
  it("caps at 80 when the play beats the record split", () => {
    expect(computeBeatenRunnerGrade(3.7, "R", ROWS)).toEqual({ grade: 80, missing: false });
    expect(computeBeatenRunnerGrade(4.0, "R", ROWS)).toEqual({ grade: 80, missing: false });
  });

  it("returns 50 at the average split", () => {
    expect(computeBeatenRunnerGrade(4.3, "R", ROWS)).toEqual({ grade: 50, missing: false });
    expect(computeBeatenRunnerGrade(4.2, "L", ROWS)).toEqual({ grade: 50, missing: false });
  });

  it("interpolates between average and record", () => {
    // RHH 4.10 → 50 + (0.20/0.30)*30 = 70
    expect(computeBeatenRunnerGrade(4.1, "R", ROWS).grade).toBe(70);
    // LHH 4.10 → 50 + (0.10/0.30)*30 = 60
    expect(computeBeatenRunnerGrade(4.1, "L", ROWS).grade).toBe(60);
  });

  it("interpolates between floor and average", () => {
    // RHH 4.45 → 20 + (0.15/0.30)*30 = 35
    expect(computeBeatenRunnerGrade(4.45, "R", ROWS).grade).toBe(35);
  });

  it("floors at 20 for slow plays", () => {
    expect(computeBeatenRunnerGrade(6.0, "R", ROWS)).toEqual({ grade: 20, missing: false });
  });

  it("is handedness sensitive — the same time grades differently", () => {
    const r = computeBeatenRunnerGrade(4.15, "R", ROWS).grade!;
    const l = computeBeatenRunnerGrade(4.15, "L", ROWS).grade!;
    expect(r).toBeGreaterThan(l);
  });

  it("rounds to the nearest 5-point scouting grade", () => {
    const g = computeBeatenRunnerGrade(4.17, "R", ROWS).grade!;
    expect(g % 5).toBe(0);
  });

  it("returns missing, never a number, when play time is absent or invalid", () => {
    for (const t of [null, undefined, 0, -1, Number.NaN]) {
      const res = computeBeatenRunnerGrade(t as any, "R", ROWS);
      expect(res).toEqual({ grade: null, missing: true, missing_reason: "no_play_time" });
    }
  });

  it("returns missing when the reference row is absent", () => {
    expect(computeBeatenRunnerGrade(4.1, "R", [])).toEqual({
      grade: null,
      missing: true,
      missing_reason: "no_scale_reference",
    });
  });

  it("returns missing when the reference row lacks a floor", () => {
    const rows = [{ ...ROWS[0], floor_value: null }];
    expect(computeBeatenRunnerGrade(4.1, "R", rows).missing).toBe(true);
    expect(computeBeatenRunnerGrade(4.1, "R", rows)).toMatchObject({
      missing_reason: "incomplete_scale_reference",
    });
  });

  it("returns missing when direction is not lower_better", () => {
    const rows = [{ ...ROWS[0], direction: "sideways_better" }];
    expect(computeBeatenRunnerGrade(4.1, "R", rows)).toMatchObject({
      missing_reason: "unsupported_direction",
    });
  });

  it("is monotonic — faster plays never grade lower", () => {
    let prev = -Infinity;
    for (let t = 5.0; t >= 3.5; t -= 0.05) {
      const g = computeBeatenRunnerGrade(t, "R", ROWS).grade!;
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });
});

describe("gradeFromScaleRow with higher_better anchors", () => {
  const VELO = [
    {
      metric: "throw_velo_mph_infield",
      direction: "higher_better",
      floor_value: 75,
      avg_value: 88,
      record_value: 95,
    },
  ];

  it("grades 50 at the average and 80 at or above the record", () => {
    expect(gradeFromScaleRow(88, "throw_velo_mph_infield", VELO)).toEqual({
      grade: 50,
      missing: false,
    });
    expect(gradeFromScaleRow(95, "throw_velo_mph_infield", VELO).grade).toBe(80);
    expect(gradeFromScaleRow(101, "throw_velo_mph_infield", VELO).grade).toBe(80);
  });

  it("floors at 20 below the floor value", () => {
    expect(gradeFromScaleRow(70, "throw_velo_mph_infield", VELO).grade).toBe(20);
  });

  it("is monotonic — harder throws never grade lower", () => {
    let prev = -Infinity;
    for (let v = 70; v <= 100; v += 1) {
      const g = gradeFromScaleRow(v, "throw_velo_mph_infield", VELO).grade!;
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });
});
