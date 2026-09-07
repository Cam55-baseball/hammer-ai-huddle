/**
 * Competition-level ladder.
 *
 * `wk_movement_catalog.min_competition_level` has existed on every row since
 * the catalog was built and was never read by anything. That meant a
 * professional was filtered by the same ceilings as a fourteen-year-old. This
 * module turns the field into an actual gate.
 *
 * The gate only ever OPENS movements for higher levels. It never closes a
 * movement that was previously available at a given level, and it never
 * touches an age, safety-flag or CNS gate — those are independent and still
 * apply on top.
 *
 * Unknown level is unknown, not zero: an athlete with no level answered is
 * treated as satisfying nothing above the base tier, exactly as before this
 * gate existed, so nothing regresses for an athlete who simply hasn't told us.
 */

export const COMPETITION_LEVEL_VERSION = "competition_level_v1";

/** Ordered ladder. Higher rank = higher level of play. */
const RANKS: Record<string, number> = {
  // Youth
  youth: 1, "8u": 1, youth_8u: 1, "10u": 2, youth_10u: 2,
  "12u": 3, youth_12u: 3, little_league: 3,
  // Middle school
  middle_school: 4, "13u": 4, "14u": 4, youth_14u: 4, junior_high: 4,
  // High school
  hs_jv: 5, jv: 5, high_school_jv: 5, freshman: 5,
  hs_varsity: 6, varsity: 6, high_school: 6, high_school_varsity: 6,
  travel_elite: 6, showcase: 6, "16u": 6, "18u": 6,
  // College
  juco: 7, njcaa: 7, ncaa_d3: 7, d3: 7, naia: 7,
  ncaa_d2: 8, d2: 8, college: 8, summer_collegiate: 8, collegiate: 8,
  ncaa_d1: 9, d1: 9,
  // Professional
  indy: 9, independent: 9,
  milb: 10, minor_league: 10, minors: 10, affiliated: 10,
  pro: 11, professional: 11, npf: 11, ausl: 11,
  mlb: 12, major_league: 12, majors: 12,
};

export function competitionRank(level: string | null | undefined): number | null {
  if (level == null) return null;
  const key = String(level).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "") return null;
  return RANKS[key] ?? null;
}

export interface AthleteLevelInput {
  competition_level?: string | null;
  competition_last_level?: string | null;
  level_target?: string | null;
  is_professional?: boolean | null;
}

/**
 * The athlete's effective rank. A professional flag floors the athlete at the
 * pro tier even when the free-text level is missing or unrecognised.
 * `level_target` is an aspiration, never an entitlement — it is ignored here.
 */
export function resolveAthleteRank(input: AthleteLevelInput): number | null {
  const explicit =
    competitionRank(input.competition_level) ?? competitionRank(input.competition_last_level);
  if (input.is_professional === true) return Math.max(explicit ?? 0, RANKS.pro);
  return explicit;
}

/**
 * True when a movement's minimum competition level is satisfied.
 * Null minimum = no gate. Unknown athlete rank = only ungated movements.
 */
export function meetsCompetitionLevel(
  minLevel: string | null | undefined,
  athleteRank: number | null,
): boolean {
  const min = competitionRank(minLevel);
  if (min == null) return true;
  if (athleteRank == null) return false;
  return athleteRank >= min;
}

/** Levels at or above the professional tier. */
export function isProfessionalRank(rank: number | null): boolean {
  return rank != null && rank >= RANKS.pro;
}
