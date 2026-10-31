/**
 * Owner Fix 9 (2026-10-31): experienced lifters returning from a layoff.
 *
 * The spike cap may never cut an experienced lifter's main-lift row below the
 * quarter template's lowest legal set count. Easing back in lowers intensity
 * (about 65–70%, 3–4 reps in reserve) instead of sets. New lifters keep the
 * existing safe ramp. Pure — shared by the generator and tests.
 */

export const RETURNER_VERSION = "returner_v1";
export const EXPERIENCED_MIN_YEARS = 2;
export const EASE_BACK_PCT_MAX = 70;
export const EASE_BACK_PCT_MIN = 65;
export const EASE_BACK_RIR_MIN = 3;
export const EASE_BACK_SENTENCE =
  "Easing back in: same sets, lighter weight — about 65–70% with 3–4 reps left in the tank.";

/** Years from stated lifting history, else lifting age. Unknown → null. */
export function statedLiftingYears(
  liftingHistory: unknown,
  liftingAgeYears: unknown,
): number | null {
  const h = (liftingHistory && typeof liftingHistory === "object") ? liftingHistory as Record<string, unknown> : null;
  const fromHistory = h ? Number(h.total_years) : NaN;
  if (Number.isFinite(fromHistory) && h?.total_years !== "" && h?.total_years != null) return fromHistory;
  const age = Number(liftingAgeYears);
  if (liftingAgeYears != null && liftingAgeYears !== "" && Number.isFinite(age)) return age;
  return null;
}

export function isExperiencedLifter(liftingHistory: unknown, liftingAgeYears: unknown): boolean {
  const y = statedLiftingYears(liftingHistory, liftingAgeYears);
  return y != null && y >= EXPERIENCED_MIN_YEARS;
}

/**
 * Lowest set count the spike cap may leave on a lift row. Experienced lifters
 * keep the template minimum (never more than the row already has); everyone
 * else keeps the existing floor of 1.
 */
export function liftFloorSets(
  plannedSets: number,
  templateMinSets: number | null | undefined,
  experienced: boolean,
): number {
  const planned = Math.max(1, Math.floor(Number(plannedSets) || 1));
  if (!experienced) return 1;
  const min = Math.floor(Number(templateMinSets));
  if (!Number.isFinite(min) || min < 1) return 1;
  return Math.min(planned, min);
}

/** Intensity for an eased row: never raises a lower prescribed %. */
export function easeBackLoadPct(loadPct: number | null | undefined): number | null {
  if (loadPct == null || !Number.isFinite(Number(loadPct))) return null;
  const n = Number(loadPct);
  return n > EASE_BACK_PCT_MAX ? EASE_BACK_PCT_MAX : n;
}
