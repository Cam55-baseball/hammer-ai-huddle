import { it, expect } from "vitest";
import { compareToBaseline, alertsFor, alertSentence, percentileCont, BASELINE_MIN_CLIPS, BASELINE_COPY, TREND_COPY } from "../athleteBaseline";
import { correlateMetrics, toObservations, whatMovesWith, spearman, EVIDENCE_BAR, type MetricPair } from "../metricCorrelation";

const hist = (vals: number[]) => vals.map((v, i) => ({ clip_id: `c${String(i).padStart(2, "0")}`, recorded_at: `2026-09-${String(i + 1).padStart(2, "0")}`, value: v }));
const steady = [30, 31, 29, 30, 32, 28, 30, 31];

it("percentile matches Postgres percentile_cont", () => {
  expect(percentileCont([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
  expect(percentileCont([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
});
it("still learning below the minimum clip count", () => {
  expect(compareToBaseline(hist(steady.slice(0, BASELINE_MIN_CLIPS - 1)), 30, 6).status).toBe("still_learning");
});
it("flags both directions against the athlete's own range", () => {
  expect(compareToBaseline(hist(steady), 30, 1).status).toBe("usual");
  expect(compareToBaseline(hist(steady), 20, 1).status).toBe("well_below");
  expect(compareToBaseline(hist(steady), 40, 1).status).toBe("well_above");
});
it("one wild clip in the history does not move the baseline", () => {
  const a = compareToBaseline(hist(steady), 30, 1), b = compareToBaseline(hist([...steady.slice(0, 7), 400]), 30, 1);
  expect(Math.abs((a.centre ?? 0) - (b.centre ?? 0))).toBeLessThanOrEqual(0.5);
  expect(b.status).toBe("usual");
});
it("noise floor widens the band — noise is never a change", () => {
  expect(compareToBaseline(hist(steady), 35, 6).status).toBe("usual");
});
it("sustained drift is detected, a single odd clip is not", () => {
  const drifting = [...steady, 30, 36, 37, 36];
  expect(compareToBaseline(hist(drifting), 37, 1).trend).toBe("rising");
  expect(compareToBaseline(hist([...steady, 30, 30, 31, 29]), 37, 1).trend).toBe("steady");
});
it("alerts need a declared floor and enough confidence", () => {
  const r = compareToBaseline(hist(steady), 20, 1);
  expect(alertsFor(r, { noiseFloorDeclared: false, confidence: null })).toEqual([]);
  expect(alertsFor(r, { noiseFloorDeclared: true, confidence: 0.2 })).toEqual([]);
  expect(alertsFor(r, { noiseFloorDeclared: true, confidence: null })).toEqual([{ kind: "outlier", direction: "below" }]);
});
it("deterministic regardless of input order", () => {
  expect(compareToBaseline(hist(steady), 25, 1)).toEqual(compareToBaseline([...hist(steady)].reverse(), 25, 1));
});
it("athlete copy has no numbers", () => {
  const all = [...Object.values(BASELINE_COPY), ...Object.values(TREND_COPY),
    ...(["outlier", "drift"] as const).flatMap((k) => (["below", "above"] as const).map((d) => alertSentence("separation", k, d)))];
  for (const t of all) expect(t).not.toMatch(/\d/);
});
it("correlation needs five paired clips and skips missing values", () => {
  const rows = [1, 2, 3, 4, 5].flatMap((i) => toObservations(`v${i}`, `2026-09-0${i}T00:00:00Z`, "sp", { a: { values: { x: i, y: null } }, b: { values: { x: i * 2 } } }));
  expect(rows.some((r) => r.metric_key === "sp.a.y")).toBe(false);
  expect(correlateMetrics(rows, "sp.a.x", "sp.b.x")!.r).toBeCloseTo(1);
});
it("spearman is rank-based", () => { expect(spearman([1, 2, 3, 4], [1, 4, 9, 1000])).toBeCloseTo(1); });

const day = (i: number) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
it("nothing surfaces below the evidence bar", () => {
  const pairs: MetricPair[] = Array.from({ length: EVIDENCE_BAR.min_n - 1 }, (_, i) => ({ key_a: "sep", key_b: "velo", value_a: i, value_b: i, day: day(i) }));
  expect(whatMovesWith(pairs, "sep")[0]).toMatchObject({ surfaced: false, reason: "not_enough_paired_sessions" });
});
it("a strong, replicating relationship clears; noise does not", () => {
  const strong: MetricPair[] = Array.from({ length: 30 }, (_, i) => ({ key_a: "sep", key_b: "velo", value_a: i, value_b: i + ((i * 7) % 3), day: day(i) }));
  const noise: MetricPair[] = Array.from({ length: 30 }, (_, i) => ({ key_a: "load", key_b: "sep", value_a: (i * 37) % 11, value_b: i, day: day(i) }));
  const out = whatMovesWith([...strong, ...noise], "sep");
  expect(out.find((v) => v.other === "velo")).toMatchObject({ surfaced: true, direction: "moves_with" });
  expect(out.find((v) => v.other === "load")!.surfaced).toBe(false);
});
