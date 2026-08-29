/**
 * Throwing rep catalog — throwing as its own domain, rather than "pitching
 * minus a few tiles". Position context is load-bearing: an outfield throw and
 * an infield throw are not the same measurement.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

export const THROWING_POSITION_CONTEXTS = [
  "infield",
  "outfield",
  "catcher",
  "relay",
  "on_the_run",
] as const;

export type ThrowingPositionContext =
  (typeof THROWING_POSITION_CONTEXTS)[number];

export function isThrowingPositionContext(
  v: string,
): v is ThrowingPositionContext {
  return (THROWING_POSITION_CONTEXTS as readonly string[]).includes(v);
}

export const THROWING_METRICS = [
  "throw_velo_mph",
  "carry_ft",
  "accuracy_score",
  "release_time_sec",
] as const;

export type ThrowingMetric = (typeof THROWING_METRICS)[number];

export function isThrowingMetric(v: string): v is ThrowingMetric {
  return (THROWING_METRICS as readonly string[]).includes(v);
}

const UNITS: Record<ThrowingMetric, string> = {
  throw_velo_mph: "mph",
  carry_ft: "ft",
  accuracy_score: "score",
  release_time_sec: "sec",
};

export function defaultUnitFor(metric: ThrowingMetric): string {
  return UNITS[metric];
}

export const THROWING_METRIC_LABELS: Record<ThrowingMetric, string> = {
  throw_velo_mph: "Throw velocity",
  carry_ft: "Carry",
  accuracy_score: "Accuracy",
  release_time_sec: "Release time",
};

export const THROWING_CONTEXT_LABELS: Record<ThrowingPositionContext, string> = {
  infield: "Infield",
  outfield: "Outfield",
  catcher: "Catcher",
  relay: "Relay",
  on_the_run: "On the run",
};

export type ThrowingSource = "video_detected" | "manual_entry";

export interface ThrowingRepRow {
  id: string;
  user_id: string;
  position_context: ThrowingPositionContext;
  metric: ThrowingMetric;
  value: number | null;
  unit: string | null;
  source: ThrowingSource;
  confidence: number | null;
  missing_reason: string | null;
  recorded_by: string | null;
  created_at: string;
}
