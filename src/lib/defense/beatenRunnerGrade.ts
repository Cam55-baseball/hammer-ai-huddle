/**
 * Beaten-runner grade — pure computation.
 *
 * Given the total time a defensive play took (contact → out recorded) and the
 * handedness of the batter-runner, returns the highest 20–80 runner grade that
 * the play would have beaten, by interpolating against the `scale_reference`
 * home-to-first splits (`home_to_first_rhh` / `home_to_first_lhh`,
 * direction `lower_better`).
 *
 * Anchors on the reference row:
 *   floor_value  → grade 20   (slowest)
 *   avg_value    → grade 50
 *   record_value → grade 80   (fastest)
 *
 * Honesty rule: missing or unusable inputs return a missing result with a
 * reason. A grade is never fabricated.
 */

export type BatterHandedness = "L" | "R";

/** The subset of a `scale_reference` row this computation needs. */
export interface ScaleReferenceRow {
  metric: string;
  direction: string | null;
  floor_value: number | null;
  avg_value: number;
  record_value: number;
}

export type BeatenRunnerMissingReason =
  | "no_play_time"
  | "no_scale_reference"
  | "incomplete_scale_reference"
  | "unsupported_direction";

export type BeatenRunnerResult =
  | { grade: number; missing: false }
  | { grade: null; missing: true; missing_reason: BeatenRunnerMissingReason };

export function metricForHandedness(hand: BatterHandedness): string {
  return hand === "L" ? "home_to_first_lhh" : "home_to_first_rhh";
}

function missing(reason: BeatenRunnerMissingReason): BeatenRunnerResult {
  return { grade: null, missing: true, missing_reason: reason };
}

/**
 * Round to the nearest half-grade (scouting convention) and clamp to 20–80.
 * Exported so aggregation reuses this exact rounding rather than duplicating it.
 */
export function toScoutingGrade(raw: number): number {
  const clamped = Math.max(20, Math.min(80, raw));
  return Math.round(clamped / 5) * 5;
}

/**
 * Shared 20–80 interpolation against ONE `scale_reference` row.
 *
 * This is the single implementation. Beaten-runner, home-to-first, and
 * catcher pop time all route through here — there is no second copy.
 */
export function gradeFromScaleRow(
  value: number | null | undefined,
  metric: string,
  scaleRows: readonly ScaleReferenceRow[],
  noValueReason: BeatenRunnerMissingReason = "no_play_time",
): BeatenRunnerResult {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return missing(noValueReason);
  }

  const row = scaleRows.find((r) => r.metric === metric);
  if (!row) return missing("no_scale_reference");
  if (row.direction !== "lower_better") return missing("unsupported_direction");

  const floor = row.floor_value;
  const avg = row.avg_value;
  const record = row.record_value;
  if (
    floor == null ||
    !Number.isFinite(floor) ||
    !Number.isFinite(avg) ||
    !Number.isFinite(record) ||
    !(record < avg && avg < floor)
  ) {
    return missing("incomplete_scale_reference");
  }

  const t = value;
  let raw: number;
  if (t <= record) {
    raw = 80;
  } else if (t <= avg) {
    // between record (80) and average (50)
    raw = 50 + ((avg - t) / (avg - record)) * 30;
  } else if (t <= floor) {
    // between average (50) and floor (20)
    raw = 20 + ((floor - t) / (floor - avg)) * 30;
  } else {
    raw = 20;
  }

  return { grade: toScoutingGrade(raw), missing: false };
}

/**
 * @param totalPlayTimeSec contact → out recorded, in seconds
 * @param hand batter-runner handedness
 * @param scaleRows rows loaded from `scale_reference`
 */
export function computeBeatenRunnerGrade(
  totalPlayTimeSec: number | null | undefined,
  hand: BatterHandedness,
  scaleRows: readonly ScaleReferenceRow[],
): BeatenRunnerResult {
  return gradeFromScaleRow(
    totalPlayTimeSec,
    metricForHandedness(hand),
    scaleRows,
    "no_play_time",
  );
}

