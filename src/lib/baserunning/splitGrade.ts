/**
 * Baserunning split → `scale_reference` anchor mapping.
 *
 * Only splits that have a real seeded anchor can be graded. Everything else
 * returns null rather than a number invented from an anchor that does not
 * exist.
 *
 * Anchor provenance (all baseball, all public benchmark research):
 *   home_to_first_rhh / home_to_first_lhh — handedness-specific, graded via
 *     `computeHomeToFirstGrade`.
 *   speed_60yd_dash        — existing seeded row (7.5 / 6.95 / 6.4, lower_better)
 *   ten_yard_split         — DERIVED from the 30-yard combine anchor ratios,
 *     not independently sourced; revisit if better data surfaces.
 *   lead_distance_primary  — Statcast-reported ~11 ft average lead
 *   lead_distance_secondary— Statcast-reported ~20 ft average secondary lead
 */

import {
  gradeFromScaleRow,
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";
import type { BaserunningSplitEvent } from "@/lib/baserunning/splits";

/** Split events that are anchored, and the `scale_reference.metric` they use. */
export const BASERUNNING_SPLIT_METRICS: Partial<
  Record<BaserunningSplitEvent, string>
> = {
  sixty_yard_dash: "speed_60yd_dash",
  ten_yard_split: "ten_yard_split",
  lead_distance_primary: "lead_distance_primary",
  lead_distance_secondary: "lead_distance_secondary",
};

/** Every metric name a baserunning surface needs to load from the DB. */
export const BASERUNNING_SCALE_METRICS: readonly string[] = [
  "home_to_first_rhh",
  "home_to_first_lhh",
  ...Object.values(BASERUNNING_SPLIT_METRICS),
];

export function baserunningSplitMetric(
  event: string,
): string | undefined {
  return BASERUNNING_SPLIT_METRICS[event as BaserunningSplitEvent];
}

/** Grade a non-handedness split against its seeded anchor, if one exists. */
export function computeBaserunningSplitGrade(
  event: string,
  value: number | null | undefined,
  scaleRows: readonly ScaleReferenceRow[],
): BeatenRunnerResult | null {
  const metric = baserunningSplitMetric(event);
  if (!metric) return null;
  return gradeFromScaleRow(value, metric, scaleRows, "no_play_time");
}
