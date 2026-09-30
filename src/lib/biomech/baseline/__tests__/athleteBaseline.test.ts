import { it, expect } from "vitest";
import { compareToBaseline, BASELINE_MIN_CLIPS, BASELINE_COPY, TREND_COPY } from "../athleteBaseline";
import { correlateMetrics, toObservations } from "../metricCorrelation";

const hist = (vals: number[]) => vals.map((v, i) => ({ clip_id: `c${i}`, recorded_at: `2026-09-${String(i + 1).padStart(2, "0")}`, value: v }));
const steady = [30, 31, 29, 30, 32, 28, 30, 31];

it("still learning below the minimum clip count", () => {
  expect(compareToBaseline(hist(steady.slice(0, BASELINE_MIN_CLIPS - 1)), 30, 6).status).toBe("still_learning");
});
it("flags both directions against the athlete's own range", () => {
  expect(compareToBaseline(hist(steady), 30, 1).status).toBe("usual");
  expect(compareToBaseline(hist(steady), 20, 1).status).toBe("well_below");
  expect(compareToBaseline(hist(steady), 40, 1).status).toBe("well_above");
});
it("noise floor widens the band — noise is never a change", () => {
  expect(compareToBaseline(hist(steady), 35, 6).status).toBe("usual");
});
it("deterministic regardless of input order", () => {
  const a = compareToBaseline(hist(steady), 25, 1), b = compareToBaseline([...hist(steady)].reverse(), 25, 1);
  expect(a).toEqual(b);
});
it("athlete copy has no numbers", () => {
  for (const t of [...Object.values(BASELINE_COPY), ...Object.values(TREND_COPY)]) expect(t).not.toMatch(/\d/);
});
it("correlation needs five paired clips and skips missing values", () => {
  const rows = [1, 2, 3, 4, 5].flatMap((i) => toObservations(`v${i}`, `2026-09-0${i}T00:00:00Z`, "sp", { a: { values: { x: i, y: null } }, b: { values: { x: i * 2 } } }));
  expect(rows.some((r) => r.metric_key === "sp.a.y")).toBe(false);
  expect(correlateMetrics(rows, "sp.a.x", "sp.b.x")!.r).toBeCloseTo(1);
  expect(correlateMetrics(rows.slice(0, 6), "sp.a.x", "sp.b.x")).toBeNull();
});
