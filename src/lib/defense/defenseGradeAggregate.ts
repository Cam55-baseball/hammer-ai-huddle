/**
 * Defense grade aggregation — pure computation.
 *
 * Each `defensive_plays` row carries one rep: `beaten_runner_grade`, the
 * highest 20–80 runner grade that single play would have beaten. This module
 * rolls many reps into ONE defense grade for an athlete.
 *
 * Design rules:
 * - Reuses `toScoutingGrade` from `beatenRunnerGrade.ts` for the 20–80 clamp +
 *   5-point rounding. No second parallel grade calculation exists.
 * - Reuses `gradeToLabel` from `gradeEngine.ts` for the human label, so the
 *   defense grade speaks the same language as every other graded surface.
 * - Recency-weighted by exponential half-life. A straight average is available
 *   by passing `recencyWeighted: false`.
 * - Honesty rule: no reps, or no reps with a grade, returns a missing result.
 *   A grade is never fabricated.
 *
 * Not wired to `vault_scout_grades` — this is the pure aggregation only.
 */

import { toScoutingGrade } from "./beatenRunnerGrade";
import { gradeToLabel } from "@/lib/gradeEngine";

/** The subset of a `defensive_plays` row this aggregation needs. */
export interface DefensivePlayRep {
  beaten_runner_grade: number | null;
  /** ISO timestamp — `created_at` on the row. Missing dates are unweighted. */
  created_at?: string | null;
}

export interface DefenseGradeOptions {
  /** Evaluation instant. Injected so the function stays pure/testable. */
  now?: Date;
  /** Exponential half-life in days for recency weighting. */
  halfLifeDays?: number;
  /** Set false for a straight (unweighted) average. */
  recencyWeighted?: boolean;
}

export type DefenseGradeMissingReason = "no_reps" | "no_graded_reps";

export type DefenseGradeResult =
  | {
      grade: number;
      label: string;
      /** Pre-rounding weighted mean of the reps used. */
      rawMean: number;
      repsUsed: number;
      repsTotal: number;
      missing: false;
    }
  | {
      grade: null;
      label: null;
      rawMean: null;
      repsUsed: 0;
      repsTotal: number;
      missing: true;
      missing_reason: DefenseGradeMissingReason;
    };

export const DEFAULT_DEFENSE_HALF_LIFE_DAYS = 45;

function weightFor(
  createdAt: string | null | undefined,
  now: Date,
  halfLifeDays: number,
  recencyWeighted: boolean,
): number {
  if (!recencyWeighted || !createdAt) return 1;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return 1;
  const ageDays = Math.max(0, (now.getTime() - t) / 86_400_000);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Roll an athlete's individual defensive reps into one 20–80 defense grade.
 */
export function aggregateDefenseGrade(
  plays: readonly DefensivePlayRep[],
  options: DefenseGradeOptions = {},
): DefenseGradeResult {
  const repsTotal = plays.length;
  if (repsTotal === 0) {
    return {
      grade: null,
      label: null,
      rawMean: null,
      repsUsed: 0,
      repsTotal: 0,
      missing: true,
      missing_reason: "no_reps",
    };
  }

  const now = options.now ?? new Date();
  const halfLifeDays = options.halfLifeDays ?? DEFAULT_DEFENSE_HALF_LIFE_DAYS;
  const recencyWeighted = options.recencyWeighted ?? true;

  let weightSum = 0;
  let weightedTotal = 0;
  let repsUsed = 0;

  for (const p of plays) {
    const g = p.beaten_runner_grade;
    if (g == null || !Number.isFinite(g)) continue; // missing stays missing
    const w = weightFor(p.created_at, now, halfLifeDays, recencyWeighted);
    if (w <= 0) continue;
    weightedTotal += g * w;
    weightSum += w;
    repsUsed++;
  }

  if (repsUsed === 0 || weightSum <= 0) {
    return {
      grade: null,
      label: null,
      rawMean: null,
      repsUsed: 0,
      repsTotal,
      missing: true,
      missing_reason: "no_graded_reps",
    };
  }

  const rawMean = weightedTotal / weightSum;
  const grade = toScoutingGrade(rawMean);

  return {
    grade,
    label: gradeToLabel(grade),
    rawMean,
    repsUsed,
    repsTotal,
    missing: false,
  };
}
