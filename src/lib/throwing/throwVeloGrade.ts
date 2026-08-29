/**
 * Throwing velocity → `scale_reference` anchor mapping.
 *
 * Throw velocity is position-context specific: an outfield throw and an
 * infield throw are not the same measurement, so each has its own anchor.
 * Contexts without an anchor (relay, on the run) and metrics without an
 * anchor (carry, accuracy, release time) return null — never a fabricated
 * grade.
 *
 * Anchor provenance (all baseball, public recruiting/scouting benchmark
 * research, not proprietary data):
 *   throw_velo_mph_infield  — 75 / 88 / 95, higher_better
 *   throw_velo_mph_outfield — 78 / 90 / 98, higher_better
 *   throw_velo_mph_catcher  — 65 / 75 / 85, higher_better (distinct from pop time)
 */

import {
  gradeFromScaleRow,
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";
import type {
  ThrowingMetric,
  ThrowingPositionContext,
} from "@/lib/throwing/reps";

export const THROW_VELO_METRICS: Partial<
  Record<ThrowingPositionContext, string>
> = {
  infield: "throw_velo_mph_infield",
  outfield: "throw_velo_mph_outfield",
  catcher: "throw_velo_mph_catcher",
};

/** Every metric name a throwing surface needs to load from the DB. */
export const THROWING_SCALE_METRICS: readonly string[] = Object.values(
  THROW_VELO_METRICS,
);

export function throwVeloMetric(
  context: ThrowingPositionContext,
): string | undefined {
  return THROW_VELO_METRICS[context];
}

/** Grade one throwing rep, when its metric and context are both anchored. */
export function computeThrowVeloGrade(
  metric: ThrowingMetric | string,
  context: ThrowingPositionContext | string,
  value: number | null | undefined,
  scaleRows: readonly ScaleReferenceRow[],
): BeatenRunnerResult | null {
  if (metric !== "throw_velo_mph") return null;
  const scaleMetric = throwVeloMetric(context as ThrowingPositionContext);
  if (!scaleMetric) return null;
  return gradeFromScaleRow(value, scaleMetric, scaleRows, "no_play_time");
}
