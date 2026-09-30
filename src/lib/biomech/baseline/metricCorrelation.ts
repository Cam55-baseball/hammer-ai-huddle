/**
 * Correlation over the per-clip observation store (`athlete_metric_observations`).
 * Pairs two metrics by clip, then reuses the one Pearson implementation.
 * Nothing is concluded below MIN_SAMPLES; results are exploratory, staff-only.
 */
import { pearson, MIN_SAMPLES, type CorrelationResult } from "@/lib/progress/correlations";

export interface MetricObservation { readonly video_id: string; readonly metric_key: string; readonly value: number; readonly recorded_at: string; }

export function correlateMetrics(rows: readonly MetricObservation[], xKey: string, yKey: string): CorrelationResult | null {
  const x = new Map<string, MetricObservation>();
  for (const r of rows) if (r.metric_key === xKey) x.set(r.video_id, r);
  const pts = rows.filter((r) => r.metric_key === yKey && x.has(r.video_id))
    .map((r) => ({ x: x.get(r.video_id)!.value, y: r.value, date: r.recorded_at.slice(0, 10) }));
  return pts.length < MIN_SAMPLES ? null : pearson(pts);
}

/** Flatten a card's tile values into store rows. Missing values are not written. */
export function toObservations(videoId: string, recordedAt: string, prefix: string, tiles: Record<string, { values: Readonly<Record<string, number | null>> }>): MetricObservation[] {
  const out: MetricObservation[] = [];
  for (const [k, t] of Object.entries(tiles)) for (const [vk, v] of Object.entries(t.values))
    if (v != null && Number.isFinite(v)) out.push({ video_id: videoId, metric_key: `${prefix}.${k}.${vk}`, value: v, recorded_at: recordedAt });
  return out.sort((a, b) => (a.metric_key < b.metric_key ? -1 : 1));
}
