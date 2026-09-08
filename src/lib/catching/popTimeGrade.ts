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
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";
import { rawToGrade } from "@/lib/gradeEngine";

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
 * SINGLE SOURCE OF TRUTH: pop time is owned by `GRADE_BENCHMARKS.pop_time`
 * (it cites MLB Statcast; the `scale_reference` row carried only generic
 * boilerplate). This function keeps its `scale_reference`-shaped signature so
 * every caller stays honest about missing anchors, but the NUMBER now comes
 * from the same table the Vault/combine surfaces use — so a 1.96s pop time
 * grades identically wherever it is shown.
 *
 * @param popTimeSec recorded pop time, in seconds
 * @param scaleRows rows loaded from `scale_reference` — presence only; a
 *        missing row still means "no anchors for this athlete's sport"
 * @param opts sport and age; age defaults to the professional band, matching
 *        the MLB-level anchors this surface graded against before unification
 */
export function computePopTimeGrade(
  popTimeSec: number | null | undefined,
  scaleRows: readonly ScaleReferenceRow[],
  opts?: { sport?: "baseball" | "softball"; age?: number | null },
): PopTimeGradeResult {
  if (popTimeSec == null || !Number.isFinite(popTimeSec) || popTimeSec <= 0) {
    return { grade: null, missing: true, missing_reason: "no_play_time" };
  }
  if (!scaleRows.some((r) => r.metric === CATCHER_POP_TIME_METRIC)) {
    return { grade: null, missing: true, missing_reason: "no_scale_reference" };
  }
  const grade = rawToGrade(
    "pop_time",
    popTimeSec,
    opts?.sport ?? "baseball",
    opts?.age ?? 25,
  );
  if (grade == null) {
    return { grade: null, missing: true, missing_reason: "no_scale_reference" };
  }
  return { grade, missing: false };
}

