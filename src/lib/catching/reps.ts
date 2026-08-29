/**
 * Catching rep catalog — mirrors the naming already used by the combine and
 * baserunning catalogs so shared metric names mean the same thing everywhere.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

export const CATCHING_METRICS = [
  "pop_time_sec",
  "throw_velo_mph",
  "framing_strikes_above_expected",
  "block_success",
  "exchange_time_sec",
] as const;

export type CatchingMetric = (typeof CATCHING_METRICS)[number];

export function isCatchingMetric(v: string): v is CatchingMetric {
  return (CATCHING_METRICS as readonly string[]).includes(v);
}

const UNITS: Record<CatchingMetric, string> = {
  pop_time_sec: "sec",
  throw_velo_mph: "mph",
  framing_strikes_above_expected: "strikes",
  block_success: "pct",
  exchange_time_sec: "sec",
};

export function defaultUnitFor(metric: CatchingMetric): string {
  return UNITS[metric];
}

export const CATCHING_METRIC_LABELS: Record<CatchingMetric, string> = {
  pop_time_sec: "Pop time",
  throw_velo_mph: "Throw velocity",
  framing_strikes_above_expected: "Framing (strikes above expected)",
  block_success: "Block success",
  exchange_time_sec: "Exchange time",
};

/** Only pop time is anchored in `scale_reference` today. */
export function isScaleGraded(metric: CatchingMetric): boolean {
  return metric === "pop_time_sec";
}

export type CatchingSource = "video_detected" | "manual_entry";

export interface CatchingRepRow {
  id: string;
  user_id: string;
  metric: CatchingMetric;
  value: number | null;
  unit: string | null;
  source: CatchingSource;
  confidence: number | null;
  missing_reason: string | null;
  recorded_by: string | null;
  created_at: string;
}
