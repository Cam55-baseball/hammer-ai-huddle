// WIC Speed Engine — canonical selector that draws from the entire
// wk_movement_catalog speed library (category='speed_lab' or a populated
// speed_category). Replaces the tiny hardcoded sprintSlugs list.
//
// Selection follows the Phase 9 SpeedTemplate:
//   1. Resolve the template from context (season/day/adaptation).
//   2. Fill every required category with one movement.
//   3. Fill optional categories up to the CNS/PAP budget.
//   4. Prefer SPEED_PREFERRED slugs, then rotate the remainder by day-of-year
//      seed so athletes see variety without randomness.
//
// The generator's existing `certifySpeed` call then stamps governance and
// enforces validation. This module is pure data — no I/O, no side effects.

import { resolveSpeedTemplate, type SpeedTemplate, type SpeedTemplateResolutionInput } from "../speed/templates.ts";
import { ALL_SPEED_CATEGORIES, type SpeedCategory } from "../speed/movementCategories.ts";
import { isInReExposureWindow, type ProgressionState } from "../progression/progressionState.ts";
import { ENGINE_ALLOWED_DOMAINS, owningDomain } from "../domainGate.ts";

/**
 * Session shape floor — an elite speed session is a sequence, never a single
 * sprint. These minimums are what turn the card from "one vague drill" into a
 * coherent block the athlete can execute and measure.
 */
export interface SpeedShapeFloor {
  readonly min: number;
  readonly max: number;
}

export function speedShapeFloor(args: {
  isGameDay: boolean;
  isRecoveryDay: boolean;
  isDeloadWeek: boolean;
  trainingAgeClass?: string;
}): SpeedShapeFloor {
  if (args.isGameDay) return { min: 2, max: 3 };
  if (args.isRecoveryDay) return { min: 2, max: 3 };
  const cls = (args.trainingAgeClass ?? "").toLowerCase();
  if (cls.includes("begin") || cls.includes("youth")) return { min: 3, max: 4 };
  if (args.isDeloadWeek) return { min: 3, max: 4 };
  return { min: 4, max: 6 };
}

/** Elite slugs surfaced first when multiple movements fit a category. */
export const SPEED_PREFERRED: readonly string[] = [
  // Acceleration — sport-transfer starts
  "sp_wall_drive_iso",
  "sp_sport_stance_start",
  "sp_first3_contact",
  "sp_3pt_vs_2pt_audit",
  "sp_sled_10y_light",
  "sp_band_resisted_start",
  "sp_hill_short_10",
  "accel_10_30y",
  // Top speed — max-velocity mechanics
  "sp_wicket_maxvelo",
  "sp_fly_10_countdown",
  "sp_fly_20",
  "sp_fly_30_shutdown",
  "sp_fly_40",
  "sp_ins_and_outs",
  "max_velocity_flys",
  // Reactive / read-and-react
  "sp_ball_drop_react",
  "sp_pop_time_reactive",
  "sp_primary_lead_jump",
  "sp_secondary_lead_cross",
  "reactive_starts",
  // Plyometric / elastic
  "sp_pogo_double",
  "sp_pogo_single",
  "sp_singleleg_bound_alt",
  "sp_singleleg_bound_same",
  "sp_skater_bound_dist",
  "sp_continuous_broad",
  "sp_altitude_drop",
  // Resisted contrast
  "sp_prowler_contrast",
  "sp_hill_contrast",
  "sp_heavy_sled_30",
  // Overspeed
  "sp_tow_assisted_fly",
  "sp_downhill_overspeed",
  "overspeed_assist",
  // Change of direction
  "sp_mirror_5510",
  "lateral_first_step",
  "slap_runner_crossover",
  // Mobility / prep
  "frc_cars_full_body",
  "ninety_ninety_transition",
  "sp_atg_split_squat",
  "sp_copenhagen_plank",
];

// Categories the seeded catalog does not yet contain — fall back to these
// present categories so certification still passes.
const CATEGORY_FALLBACKS: Partial<Record<SpeedCategory, SpeedCategory[]>> = {
  elastic: ["plyometric", "reactive"],
  pap: ["resisted", "plyometric"],
  deceleration: ["change_of_direction", "reactive"],
};

const PAP_WEIGHT: Record<string, number> = { heavy: 1.0, moderate: 0.6, light: 0.3 };

export interface SpeedCatalogRow {
  slug: string;
  name: string;
  category?: string | null;
  speed_category?: string | null;
  pap_classification?: string | null;
  movement_velocity?: string | null;
  game_day_legal?: boolean | null;
  practice_day_legal?: boolean | null;
  season_legality?: Record<string, boolean> | null;
  training_age_legality?: Record<string, boolean> | null;
  cns_cost?: number | null;
  substitution_family?: string | null;
  transfer_group?: string | null;
  equipment?: string[] | null;
  // Precise-dosage fields — every prescription must carry at least one
  // concrete number the athlete can execute without interpretation.
  default_sets?: number | null;
  default_reps?: number | null;
  default_duration_seconds?: number | null;
  default_total_reps?: number | null;
  default_distance_feet?: number | null;
  dosage_unit?: string | null;
}

export interface SelectSpeedInput {
  catalog: readonly SpeedCatalogRow[];
  template: SpeedTemplateResolutionInput;
  eligible: (m: SpeedCatalogRow) => boolean;
  sport: "baseball" | "softball";
  dayOfYearSeed: number;
  cnsBudget: number; // absolute CNS units available for the speed block
  trainingAgeClass?: string;
  /** Read-only progression state — biases away from resting movements. */
  progression?: ProgressionState;
  isGameDay?: boolean;
  isRecoveryDay?: boolean;
}

export interface SpeedPick {
  movement: SpeedCatalogRow;
  category: string;
  required: boolean;
  reason: string;
}

export interface SpeedSelectionResult {
  template: SpeedTemplate;
  picks: SpeedPick[];
  shape: SpeedShapeFloor;
  cnsUsed: number;
  papCost: number;
  warnings: string[];
}

/** Rotate an array deterministically by a seed. */
function rotate<T>(arr: readonly T[], seed: number): T[] {
  if (arr.length === 0) return [];
  const off = ((seed % arr.length) + arr.length) % arr.length;
  return [...arr.slice(off), ...arr.slice(0, off)];
}

function pickForCategory(
  category: SpeedCategory,
  pool: SpeedCatalogRow[],
  used: Set<string>,
  usedFamilies: Set<string>,
  seed: number,
  progression?: ProgressionState,
): SpeedCatalogRow | null {
  const inCat = pool.filter(
    (m) => (m.speed_category ?? "") === category && !used.has(m.slug),
  );
  if (inCat.length === 0) return null;

  // Preferred first, ordered by SPEED_PREFERRED rank.
  const prefIndex = new Map(SPEED_PREFERRED.map((s, i) => [s, i]));
  const preferred = inCat
    .filter((m) => prefIndex.has(m.slug))
    .sort((a, b) => (prefIndex.get(a.slug)! - prefIndex.get(b.slug)!));
  const nonPreferred = rotate(
    inCat.filter((m) => !prefIndex.has(m.slug)),
    seed,
  );
  let ordered = [...preferred, ...nonPreferred];

  // Movements still inside their re-exposure window go to the back of the
  // line — never removed, so a stage is never left empty.
  if (progression) {
    const fresh = ordered.filter((m) => !isInReExposureWindow(progression, m.slug, m.speed_category));
    const resting = ordered.filter((m) => isInReExposureWindow(progression, m.slug, m.speed_category));
    ordered = [...fresh, ...resting];
  }

  // Avoid stacking two picks from the same substitution family.
  const familyFree = ordered.find((m) => {
    const fam = m.substitution_family ?? m.transfer_group ?? null;
    return !fam || !usedFamilies.has(fam);
  });
  return familyFree ?? ordered[0] ?? null;
}

export function selectSpeedPicks(input: SelectSpeedInput): SpeedSelectionResult {
  const template = resolveSpeedTemplate(input.template);
  const warnings: string[] = [];

  // Build eligible pool. Domain gate first: only an ALLOWED owning domain may
  // contribute to a speed session, so a `speed_category` tag on a conditioning
  // or mobility row can describe transfer without smuggling the movement into
  // the Speed card. Then the caller's eligibility function.
  const pool = input.catalog.filter((m) => {
    if (!ENGINE_ALLOWED_DOMAINS.speed.includes(owningDomain(m))) return false;
    if (m.speed_category == null && m.category !== "speed_lab") return false;
    return input.eligible(m);
  });

  const used = new Set<string>();
  const usedFamilies = new Set<string>();
  const usedCats = new Set<string>();
  const picks: SpeedPick[] = [];
  let cnsUsed = 0;
  let papCost = 0;
  const cnsBudget = Math.max(1, input.cnsBudget);

  const shape = speedShapeFloor({
    isGameDay: input.isGameDay ?? false,
    isRecoveryDay: input.isRecoveryDay ?? false,
    isDeloadWeek: input.progression?.isDeloadWeek ?? false,
    trainingAgeClass: input.trainingAgeClass,
  });

  const tryAdd = (category: SpeedCategory, required: boolean, reason: string): boolean => {
    if (usedCats.has(category)) return false; // single-slot categories
    if (picks.length >= shape.max) return false;
    const seed = input.dayOfYearSeed + category.length;
    let pick = pickForCategory(category, pool, used, usedFamilies, seed, input.progression);
    if (!pick) {
      const fbs = CATEGORY_FALLBACKS[category] ?? [];
      for (const fb of fbs) {
        if (usedCats.has(fb)) continue;
        pick = pickForCategory(fb, pool, used, usedFamilies, seed, input.progression);
        if (pick) {
          warnings.push(`speed_category_fallback:${category}->${fb}`);
          break;
        }
      }
    }
    if (!pick) {
      if (required) warnings.push(`speed_missing_required:${category}`);
      return false;
    }
    const cost = pick.cns_cost ?? 1;
    if (cnsUsed + cost > cnsBudget && !required) return false;
    used.add(pick.slug);
    const fam = pick.substitution_family ?? pick.transfer_group ?? null;
    if (fam) usedFamilies.add(fam);
    usedCats.add(pick.speed_category ?? category);
    cnsUsed += cost;
    papCost += PAP_WEIGHT[(pick.pap_classification ?? "light").toLowerCase()] ?? 0.3;
    picks.push({ movement: pick, category: pick.speed_category ?? category, required, reason });
    return true;
  };

  // 1) Required categories first.
  for (const cat of template.requiredCategories) {
    tryAdd(cat, true, `Required by ${template.displayName}.`);
  }

  // 2) Optional categories in template order, respecting CNS + PAP budget.
  const papCap = Math.max(0.3, template.papBudget * 3);
  for (const cat of template.optionalCategories) {
    if (usedCats.has(cat)) continue;
    if (papCost >= papCap) break;
    tryAdd(cat, false, `Complement to ${template.displayName}.`);
  }

  // 3) Session shape floor — an elite speed day is a sequence, not one drill.
  //    Backfill from the remaining legal categories (template order first,
  //    then canonical order) until the floor is met.
  if (picks.length < shape.min) {
    const backfillOrder: SpeedCategory[] = [
      ...template.optionalCategories,
      ...ALL_SPEED_CATEGORIES.filter(
        (c) =>
          !template.requiredCategories.includes(c) &&
          !template.optionalCategories.includes(c) &&
          // Never sneak a high-CNS quality in as filler.
          c !== "overspeed" &&
          c !== "pap",
      ),
    ];
    for (const cat of backfillOrder) {
      if (picks.length >= shape.min) break;
      tryAdd(cat, true, `Session shape — ${template.displayName} needs a complete sequence, not a single drill.`);
    }
  }

  // 4) Guarantee at least one movement — sport-scoped fallback.
  if (picks.length === 0) {
    const sportPref = input.sport === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb";
    const fallback = pool.find((m) => m.slug === sportPref) ?? pool.find((m) => m.slug === "accel_10_30y") ?? pool[0];
    if (fallback) {
      picks.push({
        movement: fallback,
        category: fallback.speed_category ?? "acceleration",
        required: true,
        reason: "Fallback pick — no template-legal movement available.",
      });
      warnings.push("speed_used_fallback");
    }
  }

  if (picks.length < shape.min) {
    warnings.push(`speed_below_floor:${picks.length}/${shape.min}`);
  }

  return { template, picks, shape, cnsUsed, papCost, warnings };
}
