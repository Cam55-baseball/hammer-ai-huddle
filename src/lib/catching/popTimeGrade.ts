/**
 * Catcher pop-time grade — pure computation.
 *
 * Pop time (catch → ball into the fielder's glove at second) is graded on the
 * 20–80 scouting scale against the `catcher_pop_time` row in `scale_reference`
 * (floor 2.15, avg 2.02, record 1.90, direction `lower_better`).
 *
 * The interpolation itself lives in exactly one place —
 * `gradeFromScaleRow` in `@/lib/defense/beatenRunnerGrade`. This module is a
 * thin, honest re-expression of it for the catching domain, so pop time,
 * home-to-first, and beaten-runner grades can never drift apart.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

import {
  gradeFromScaleRow,
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";

export type { ScaleReferenceRow };

export const CATCHER_POP_TIME_METRIC = "catcher_pop_time";

export type PopTimeMissingReason = Extract<
  BeatenRunnerResult,
  { missing: true }
>["missing_reason"];

export type PopTimeGradeResult =
  | { grade: number; missing: false }
  | { grade: null; missing: true; missing_reason: PopTimeMissingReason };

/**
 * @param popTimeSec recorded pop time, in seconds
 * @param scaleRows rows loaded from `scale_reference`
 */
export function computePopTimeGrade(
  popTimeSec: number | null | undefined,
  scaleRows: readonly ScaleReferenceRow[],
): PopTimeGradeResult {
  return gradeFromScaleRow(
    popTimeSec,
    CATCHER_POP_TIME_METRIC,
    scaleRows,
    "no_play_time",
  );
}
