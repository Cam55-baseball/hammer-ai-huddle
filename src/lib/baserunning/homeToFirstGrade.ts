/**
 * Home-to-first grade — pure computation.
 *
 * A recorded home-to-first split is graded on the 20–80 scouting scale by the
 * exact same anchors the defensive beaten-runner calculation uses
 * (`home_to_first_rhh` / `home_to_first_lhh` in `scale_reference`,
 * direction `lower_better`).
 *
 * The interpolation lives in one place: `beatenRunnerGrade`. This module is a
 * thin, honest re-expression of it for the baserunning domain, so the two
 * surfaces can never drift apart.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

import {
  computeBeatenRunnerGrade,
  metricForHandedness,
  type BatterHandedness,
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";

export type { BatterHandedness, ScaleReferenceRow };

export type HomeToFirstMissingReason = Extract<
  BeatenRunnerResult,
  { missing: true }
>["missing_reason"];

export type HomeToFirstGradeResult =
  | { grade: number; missing: false }
  | { grade: null; missing: true; missing_reason: HomeToFirstMissingReason };

/** The `scale_reference.metric` name backing a given batter handedness. */
export const homeToFirstMetric = metricForHandedness;

/**
 * @param splitSec recorded home-to-first time, in seconds
 * @param hand batter-runner handedness ('L' | 'R')
 * @param scaleRows rows loaded from `scale_reference`
 */
export function computeHomeToFirstGrade(
  splitSec: number | null | undefined,
  hand: BatterHandedness,
  scaleRows: readonly ScaleReferenceRow[],
): HomeToFirstGradeResult {
  return computeBeatenRunnerGrade(splitSec, hand, scaleRows);
}
