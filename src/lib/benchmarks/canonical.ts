/**
 * ONE SOURCE OF TRUTH PER METRIC.
 *
 * Three acts were graded by two different systems, so the same input scored
 * differently depending on which screen the athlete was on:
 *
 *   pop time       `pop_time` (GRADE_BENCHMARKS)          vs `catcher_pop_time` (scale_reference)
 *   exchange time  `fielding_exchange_time`               vs `exchange_time_sec`
 *   throw velocity `position_throw_velo`                  vs `throw_velo_mph_infield`/`_outfield`
 *
 * Resolution rule (owner's, applied literally): the side with a recorded
 * source wins; where neither has one, `scale_reference` wins because it at
 * least carries a date. No benchmark VALUE is changed by this module — the
 * losing side simply stops holding its own copy and reads the winner's.
 *
 * Baseball only. Softball keeps its own table entries because the scale rows
 * are baseball-seeded; grading a softball athlete against them would be worse
 * than the disagreement we are fixing.
 */

import type { ScaleReferenceRow } from "@/lib/defense/beatenRunnerGrade";

export type BenchmarkSystem = "grade_benchmarks" | "scale_reference";

export interface DuplicateResolution {
  /** The metric key that now owns the numbers. */
  canonical: string;
  /** Which system that canonical key lives in. */
  winner: BenchmarkSystem;
  /** Why this side won. */
  reason: string;
}

export const DUPLICATE_RESOLUTIONS: Record<string, DuplicateResolution> = {
  // GRADE_BENCHMARKS records "MLB Statcast pop time data"; the scale row
  // carries only the generic research boilerplate. Specific source wins.
  pop_time: {
    canonical: "pop_time",
    winner: "grade_benchmarks",
    reason:
      "GRADE_BENCHMARKS cites MLB Statcast; the scale_reference row carries only generic research boilerplate.",
  },
  catcher_pop_time: {
    canonical: "pop_time",
    winner: "grade_benchmarks",
    reason: "Reads the pop_time anchors so both surfaces agree.",
  },
  // GRADE_BENCHMARKS says "Estimate" outright — an estimate is not a source.
  // The scale row documents the Realmuto transfer breakdown and is dated.
  fielding_exchange_time: {
    canonical: "exchange_time_sec",
    winner: "scale_reference",
    reason:
      "GRADE_BENCHMARKS is an admitted estimate; the scale_reference row is documented and dated.",
  },
  // Both sides are sourced, so the dated side wins — and the scale rows are
  // position-specific, which the single generic key cannot express.
  position_throw_velo: {
    canonical: "throw_velo_mph_infield",
    winner: "scale_reference",
    reason:
      "Both sourced; scale_reference is dated and position-specific. Infield is the position-neutral default.",
  },
};

/**
 * Snapshot of the `scale_reference` rows that now own a duplicated metric,
 * mirrored verbatim from the database (values unchanged) so a static grading
 * path can reach them without a query. `as_of` is the row's effective_date.
 */
export const SCALE_ANCHOR_SNAPSHOT: readonly (ScaleReferenceRow & {
  source: string;
  as_of: string;
})[] = [
  {
    metric: "exchange_time_sec",
    direction: "lower_better",
    floor_value: 0.85,
    avg_value: 0.7,
    record_value: 0.5,
    source:
      "Documented elite pop-time breakdowns (Realmuto 1.80s pop = 0.54s transfer).",
    as_of: "2026-08-29",
  },
  {
    metric: "throw_velo_mph_infield",
    direction: "higher_better",
    floor_value: 75,
    avg_value: 88,
    record_value: 95,
    source: "MLB infield throw velocity and D1 middle-infield recruiting benchmarks.",
    as_of: "2026-08-29",
  },
  {
    metric: "throw_velo_mph_outfield",
    direction: "higher_better",
    floor_value: 78,
    avg_value: 90,
    record_value: 98,
    source: "Elite HS/college corner OF verified at 87+ mph; MLB averages higher.",
    as_of: "2026-08-29",
  },
];

/** Resolution for a metric key, if it is one of the duplicated three. */
export function resolutionFor(metricKey: string): DuplicateResolution | undefined {
  return DUPLICATE_RESOLUTIONS[metricKey];
}

/** True when this key's numbers are owned by `scale_reference`. */
export function isScaleOwned(metricKey: string): boolean {
  return DUPLICATE_RESOLUTIONS[metricKey]?.winner === "scale_reference";
}

/**
 * The winning `scale_reference` anchors expressed as benchmark points, so the
 * static table shows the same numbers the grader uses rather than keeping a
 * stale second copy. floor → 20, average → 50, record → 80 (the scale's own
 * grade mapping). These are MLB-level marks, so they own the `pro` band only;
 * youth bands keep their age-appropriate table entries.
 */
export function scaleDerivedPoints(
  metric: string,
): { raw: number; grade: number }[] {
  const row = SCALE_ANCHOR_SNAPSHOT.find((r) => r.metric === metric);
  if (!row || row.floor_value == null) return [];
  return [
    { raw: row.floor_value, grade: 20 },
    { raw: row.avg_value, grade: 50 },
    { raw: row.record_value, grade: 80 },
  ];
}
