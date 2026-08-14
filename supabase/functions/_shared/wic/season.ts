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

/**
 * Deep-ROM loaded knee-flexion families.
 *
 * These are strength / ROM developers, never warm-up material, and never legal
 * before running in the same session. Gating happens at the FAMILY level so a
 * renamed or duplicated slug can never smuggle the same exercise past a safety
 * gate (the exact failure mode that put `lift_atg_split_squat` at 3x8 into an
 * in-season running day).
 */
export const DEEP_KNEE_FLEXION_FAMILIES: ReadonlySet<string> = new Set([
  "atg_split_squat",
  "sissy_squat",
  "knee_resilience",
]);

/**
 * Slugs inside a deep-knee-flexion family that ARE legal in-season, because
 * they are dosed as reduced-range, low-volume durability maintenance rather
 * than a development block. Exactly one per family.
 */
export const IN_SEASON_MAINTENANCE_SLUGS: ReadonlySet<string> = new Set([
  "kot_atg_split_squat",
]);

/** Slug/family prefixes that identify a deep-flexion movement by name. */
const DEEP_FLEXION_SLUG_HINTS = ["atg_", "_atg_", "sissy", "slide_lunge", "patrick_step"];

export function resolveMovementFamily(m: {
  slug: string;
  substitution_family?: string | null;
  family?: string | null;
}): string {
  return (m.substitution_family ?? m.family ?? m.slug) || m.slug;
}

/** True when the movement loads deep knee flexion (ATG-style). */
export function isDeepKneeFlexion(m: {
  slug: string;
  substitution_family?: string | null;
  family?: string | null;
}): boolean {
  const fam = resolveMovementFamily(m);
  if (DEEP_KNEE_FLEXION_FAMILIES.has(fam)) return true;
  const slug = (m.slug ?? "").toLowerCase();
  return DEEP_FLEXION_SLUG_HINTS.some((h) => slug.includes(h));
}

/**
 * Warm-up legality. A warm-up may only ramp tissue and CNS — it may never
 * contain a strength / deep-flexion / high-CNS developer. Anything outside this
 * allowlist is rejected before it can reach a warm-up or pre-run prep block.
 */
export const WARMUP_LEGAL_CATEGORIES: ReadonlySet<string> = new Set([
  "warmup",
  "mobility",
  "activation",
  "functional_patterning",
  "ido_portal",
  "cressey_sp",
  "frc",
  "recovery",
  "cross_sport",
]);

export function isWarmupLegal(m: {
  slug: string;
  category?: string | null;
  movement_category?: string | null;
  cns_cost?: number | null;
  is_eccentric_dominant?: boolean | null;
  substitution_family?: string | null;
  family?: string | null;
}): { legal: boolean; reason: string | null } {
  if (isDeepKneeFlexion(m)) {
    return { legal: false, reason: "deep_knee_flexion_never_warmup" };
  }
  if (m.is_eccentric_dominant) {
    return { legal: false, reason: "eccentric_dominant_never_warmup" };
  }
  const cat = (m.movement_category ?? m.category ?? "").toLowerCase();
  const slug = (m.slug ?? "").toLowerCase();
  if (!WARMUP_LEGAL_CATEGORIES.has(cat) && !slug.startsWith("frc_")) {
    return { legal: false, reason: `category_not_warmup_legal:${cat || "unknown"}` };
  }
  if ((m.cns_cost ?? 0) > 2) {
    return { legal: false, reason: "cns_cost_too_high_for_warmup" };
  }
  return { legal: true, reason: null };
}

/**
 * Same-day ordering rule: deep loaded knee flexion may never be sequenced
 * before running / sprint work. It blunts tendon stiffness and pre-fatigues the
 * quad and patellar tendon exactly when they are needed most.
 */
export function isLegalBeforeRunning(m: {
  slug: string;
  substitution_family?: string | null;
  family?: string | null;
}): boolean {
  return !isDeepKneeFlexion(m);
}


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
    substitution_family?: string | null;
    family?: string | null;
  },
): { legal: boolean; reason: string | null } {
  if (!ctx.isOffseason && OS_ONLY_ECCENTRIC_SLUGS.has(m.slug)) {
    return { legal: false, reason: "os_only_eccentric" };
  }
  if (ctx.isInSeason && IN_SEASON_BLOCKED_SLUGS.has(m.slug)) {
    return { legal: false, reason: "in_season_blocked" };
  }
  // Family-level in-season gate — a deep-flexion movement is blocked in-season
  // unless it is the one designated ROM-limited maintenance slug for its family.
  if (
    ctx.isInSeason &&
    isDeepKneeFlexion(m) &&
    !IN_SEASON_MAINTENANCE_SLUGS.has(m.slug)
  ) {
    return { legal: false, reason: "deep_knee_flexion_family_in_season_blocked" };
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
