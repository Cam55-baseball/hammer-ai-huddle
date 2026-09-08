/**
 * ONE grade scale, shared by every grading path.
 *
 * 20 is the MLB floor — it is not the app's floor. A developing athlete is
 * placed honestly against the show, and below the floor the scale keeps going
 * so he can still see himself move.
 *
 * Rules (owner doctrine, 2026-09-08):
 *   - 50  = professional average, 80 = all-time record (ceiling unchanged).
 *   - below 20 → the scale continues on a shallower tail, one decimal,
 *     clamped at 0.
 *   - at 20 and above → whole numbers (scouting convention).
 *   - never negative: a negative grade reads as a verdict, not a starting line.
 *
 * ---------------------------------------------------------------------------
 * SUB-FLOOR TAIL — A CONVENTION, NOT A BENCHMARK
 * ---------------------------------------------------------------------------
 * provenance : convention
 * as_of      : 2026-09-08
 *
 * Below the MLB floor the scale runs at ONE QUARTER of the floor→average
 * slope, which places grade 0 four floor-to-average spans below the floor.
 *
 * The multiplier was chosen to give usable separation for developing
 * athletes. It is NOT derived from any published data, any tracked
 * population, or any scouting source, and it must never be cited as one.
 * At the full floor→average slope, five of twelve realistic 14u marks pinned
 * flat at 0 — no separation, no movement, no roadmap. A quarter slope is the
 * shallowest tail that still separates every metric at the bottom.
 *
 * A sub-20 number is a DEVELOPMENT CURVE READING, not a scouting grade. No
 * scout uses numbers below 20. Any surface rendering one must present it as
 * progress toward the MLB floor, never as a professional evaluation.
 */

/** The MLB floor anchor. Below this the scale continues with decimals. */
export const MLB_FLOOR_GRADE = 20;
/** Hard bottom. Never negative. */
export const GRADE_MIN = 0;
/** Ceiling — only reachable at the all-time record. */
export const GRADE_MAX = 80;

/**
 * Sub-floor tail slope, as a fraction of the floor→average slope.
 * CONVENTION (2026-09-08) — chosen for separation, not measured. See header.
 */
export const SUB_FLOOR_SLOPE_FRACTION = 0.25;

/** Provenance of the sub-floor tail. Its own category — never "sourced". */
export const SUB_FLOOR_TAIL_PROVENANCE = {
  source: "convention" as const,
  as_of: "2026-09-08",
  rationale:
    "Quarter of the floor→average slope; places 0 four floor-to-average spans below the MLB floor. Chosen to give developing athletes usable separation. Not derived from published data.",
};

/** Copy for any surface showing a sub-20 grade. Never a scouting claim. */
export const SUB_FLOOR_DISCLOSURE =
  "Below 20 this is a development curve, not a scouting grade — it measures progress toward the professional floor.";

/** True when a grade sits below the MLB floor and must carry the disclosure. */
export function isBelowFloor(grade: number): boolean {
  return grade < MLB_FLOOR_GRADE;
}

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
 * Below-floor extension: continue downward at a QUARTER of the
 * floor(20)→average(50) slope. Convention, not a benchmark — see header.
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
  const perUnit = (30 / span) * SUB_FLOOR_SLOPE_FRACTION;
  const raw = MLB_FLOOR_GRADE + (value - floorRaw) * perUnit;
  return Math.max(GRADE_MIN, Math.min(MLB_FLOOR_GRADE, raw));
}

/** Format for display: "8.4" below the floor, "45" at or above it. */
export function formatGrade(value: number): string {
  return value < MLB_FLOOR_GRADE ? value.toFixed(1) : String(Math.round(value));
}
