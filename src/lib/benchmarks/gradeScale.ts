/**
 * ONE grade scale, shared by every grading path.
 *
 * 20 is the MLB floor — it is not the app's floor. A developing athlete is
 * placed honestly against the show, and below the floor the scale keeps going
 * so he can still see himself move: the floor→average slope is extended
 * downward and reported to one decimal.
 *
 * Rules (owner doctrine, 2026-09-08):
 *   - 50  = professional average, 80 = all-time record (ceiling unchanged).
 *   - below 20 → extend the floor→average slope, one decimal, clamped at 0.
 *   - at 20 and above → whole numbers (scouting convention).
 *   - never negative: a negative grade reads as a verdict, not a starting line.
 */

/** The MLB floor anchor. Below this the scale continues with decimals. */
export const MLB_FLOOR_GRADE = 20;
/** Hard bottom. Never negative. */
export const GRADE_MIN = 0;
/** Ceiling — only reachable at the all-time record. */
export const GRADE_MAX = 80;

/**
 * Apply the reporting convention to a computed grade.
 * Sub-floor grades keep one decimal; graded-range values stay whole.
 */
export function roundGrade(value: number): number {
  const clamped = Math.max(GRADE_MIN, Math.min(GRADE_MAX, value));
  if (clamped < MLB_FLOOR_GRADE) return Math.round(clamped * 10) / 10;
  return Math.round(clamped);
}

/**
 * Below-floor extension: continue the floor(20)→average(50) slope downward.
 *
 * @param value        the athlete's raw mark
 * @param floorRaw     raw value that sits at grade 20
 * @param averageRaw   raw value that sits at grade 50
 */
export function extendBelowFloor(
  value: number,
  floorRaw: number,
  averageRaw: number,
): number {
  const span = averageRaw - floorRaw;
  if (!Number.isFinite(span) || span === 0) return MLB_FLOOR_GRADE;
  const perUnit = 30 / span; // 20 → 50 across the floor→average span
  return MLB_FLOOR_GRADE + (value - floorRaw) * perUnit;
}

/** Format for display: "8.4" below the floor, "45" at or above it. */
export function formatGrade(value: number): string {
  return value < MLB_FLOOR_GRADE ? value.toFixed(1) : String(Math.round(value));
}
