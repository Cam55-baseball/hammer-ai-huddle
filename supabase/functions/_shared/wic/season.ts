// _shared/wic/season.ts — Phase 2 Fix 6.
// Single canonical seasonal legality authority.
//
// Every generator, validator, and season-aware check must import from here.
// Do NOT re-declare season slug lists elsewhere.

export type SeasonPhase =
  | "os_q1"
  | "os_q2"
  | "os_q3"
  | "os_q4"
  | "in_season"
  | "post_season";

export const OS_ONLY_ECCENTRIC_SLUGS: ReadonlySet<string> = new Set([
  "back_squat_double_ecc",
  "front_squat_double_ecc",
  "bench_press_double_ecc",
  "incline_bench_double_ecc",
  "hip_thrust_double_ecc",
  "rdl_double_ecc",
  "trap_bar_dl_double_ecc",
  "weighted_pullup_double_ecc",
  "nordic_curl",
  "reverse_nordic",
  "copenhagen_adduction_ecc",
  "plyo_depth_jump",
]);

export const IN_SEASON_BLOCKED_SLUGS: ReadonlySet<string> = new Set([
  ...OS_ONLY_ECCENTRIC_SLUGS,
  "atg_split_squat",
  "sissy_squat",
  "slide_lunge",
]);

export interface SeasonContext {
  phase: SeasonPhase;
  isOffseason: boolean;
  isDeepOffseason: boolean;
  isInSeason: boolean;
  isPostSeason: boolean;
}

export function seasonContextFromPhase(phase: string): SeasonContext {
  const p = phase as SeasonPhase;
  return {
    phase: p,
    isOffseason: p.startsWith("os_"),
    isDeepOffseason: p === "os_q1" || p === "os_q2",
    isInSeason: p === "in_season",
    isPostSeason: p === "post_season",
  };
}

/**
 * Single legality gate. Returns { legal, reason } so callers can log rejects.
 *
 * Combines the movement's `season_eligibility` array (WIC catalog metadata) AND
 * the legacy hard-block slug lists AND the eccentric-dominant rule. If any of
 * these say "no", the movement is illegal for this phase.
 */
export function isMovementSeasonLegal(
  ctx: SeasonContext,
  m: {
    slug: string;
    is_eccentric_dominant?: boolean | null;
    phase_allow?: string[] | null;
    season_eligibility?: string[] | null;
  },
): { legal: boolean; reason: string | null } {
  if (!ctx.isOffseason && OS_ONLY_ECCENTRIC_SLUGS.has(m.slug)) {
    return { legal: false, reason: "os_only_eccentric" };
  }
  if (ctx.isInSeason && IN_SEASON_BLOCKED_SLUGS.has(m.slug)) {
    return { legal: false, reason: "in_season_blocked" };
  }
  if (m.is_eccentric_dominant && !ctx.isOffseason) {
    return { legal: false, reason: "eccentric_dominant_off_only" };
  }
  if (m.phase_allow && m.phase_allow.length > 0 && !m.phase_allow.includes(ctx.phase)) {
    return { legal: false, reason: "phase_allow_mismatch" };
  }
  if (
    m.season_eligibility &&
    m.season_eligibility.length > 0 &&
    !m.season_eligibility.includes(ctx.phase)
  ) {
    return { legal: false, reason: "season_eligibility_mismatch" };
  }
  return { legal: true, reason: null };
}
