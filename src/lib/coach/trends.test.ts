import { describe, expect, it } from "vitest";
import { baselineLine, latestVsBaseline, metricName, observationLine, trendLabel, type TrendRow } from "./trends";

const fmt = (iso: string) => iso.slice(0, 10);

const row: TrendRow = {
  metric_key: "ten_yard_dash",
  unit: "s",
  n_used: 12,
  baseline_median: 1.62,
  band_lo: 1.58,
  band_hi: 1.66,
  trend: "stable",
  computed_at: "2026-10-01T00:00:00Z",
  recent: [{ value: 1.7, unit: "s", recorded_at: "2026-10-10T00:00:00Z", source: "test" }],
};

describe("coach trends wording", () => {
  it("labels the baseline with its range and measurement count", () => {
    expect(baselineLine(row)).toBe("Their usual: 1.58–1.66 s (from 12 measurements)");
  });

  it("says so when there is no baseline", () => {
    expect(baselineLine({ ...row, baseline_median: null })).toBe("No baseline yet — not enough measurements");
  });

  it("flags a latest reading outside the usual range", () => {
    expect(latestVsBaseline(row)).toBe("Latest reading is above their usual range");
    expect(latestVsBaseline({ ...row, recent: [{ ...row.recent![0], value: 1.6 }] })).toBe(
      "Latest reading is inside their usual range",
    );
    expect(latestVsBaseline({ ...row, recent: [] })).toBeNull();
  });

  it("words trends and unknowns honestly", () => {
    expect(trendLabel("improving")).toContain("Improving");
    expect(trendLabel(null)).toBe("Trend: not enough data yet");
  });

  it("formats metric names and observations", () => {
    expect(metricName("ten_yard_dash")).toBe("ten yard dash");
    expect(observationLine(row.recent![0], fmt)).toBe("1.7 s on 2026-10-10");
  });
});
