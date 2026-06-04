/**
 * PIE V2 — longitudinal trajectory derivation.
 *
 * Pure derivation from a list of session aggregates. No new storage.
 * Per-signal trajectory, regression detection, improvement detection.
 * RR-5 framing only — observational, no destiny framing.
 */
import type { PieV2SessionAggregate, PieV2SignalId } from "./types";

export interface PieV2Trajectory {
  signal_id: PieV2SignalId;
  samples: number;
  earliest: number | null;
  latest: number | null;
  slope_30d: number | null;
  trend: "improving" | "stable" | "regressing" | "insufficient_data";
  notable_event: "tier_crossing_up" | "tier_crossing_down" | "variance_expansion" | null;
}

function slope(xs: number[]): number | null {
  if (xs.length < 3) return null;
  const n = xs.length;
  const xm = (n - 1) / 2;
  const ym = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (xs[i] - ym);
    den += (i - xm) ** 2;
  }
  return den === 0 ? null : num / den;
}

export function trajectoryFor(
  signal_id: PieV2SignalId,
  aggs: PieV2SessionAggregate[],
): PieV2Trajectory {
  const values: number[] = [];
  for (const a of aggs) {
    const s = a.signals.find((x) => x.signal_id === signal_id);
    if (s?.average != null) values.push(s.average);
  }
  const sl = slope(values);
  const trend: PieV2Trajectory["trend"] =
    sl === null ? "insufficient_data" :
    sl > 0.5 ? "improving" :
    sl < -0.5 ? "regressing" : "stable";
  return {
    signal_id,
    samples: values.length,
    earliest: values[0] ?? null,
    latest: values[values.length - 1] ?? null,
    slope_30d: sl,
    trend,
    notable_event: null,
  };
}

export function trajectoriesAll(aggs: PieV2SessionAggregate[]): PieV2Trajectory[] {
  if (aggs.length === 0) return [];
  const ids = aggs[0].signals.map((s) => s.signal_id);
  return ids.map((id) => trajectoryFor(id, aggs));
}
