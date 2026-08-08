// WIC Bat-Speed Engine — owns the rotational-power pool.
// Preferred slugs are surfaced first when the certifier resolves a template.
// Ordering is intentional: elastic_rotation & hip-sequencing primers seed
// P1/P2/P4 mechanics, then overload/underload contrast, then med-ball power,
// then PAP complexes. Beginners are protected by season/training-age gates
// on each slug (see wk_movement_catalog seed).
export const BAT_SPEED_PREFERRED = [
  // Hip / pelvis sequencing (P1/P2/P4 — Arakawa / OnBaseU)
  "bs_cable_hip_snap",
  "bs_banded_pelvic_dissoc",
  "bs_hip_contrast_swings",
  "bs_hip_assisted_swings",
  "bs_hip_resisted_swings",
  "band_resisted_swings",
  "cable_chops",
  // Overload / underload contrast (Driveline / DeRenne)
  "bs_contrast_swing_ladder",
  "bs_knob_loaded_swings",
  "bs_pvc_overspeed_swings",
  "bs_underload_composite_tee",
  "bs_bamboo_overload_tee",
  "bs_donut_ring_dry_swings",
  "bs_bat_speed_radar_intent_set",
  // Med-ball rotational power (Cressey / USATF throws)
  "bs_mb_side_wall_toss",
  "bs_mb_shotput_switch",
  "bs_mb_rebounder_rapid",
  "bs_mb_lateral_bound_toss",
  "med_ball_shot_put",
  // PAP / French contrast (Verkhoshansky / Cal Dietz)
  "bs_trapbar_jump_to_swing",
  "bs_french_contrast_swing",
  "bs_hip_thrust_to_mb_throw",
  "bs_cable_chop_to_swing",
  // Rotational strength & anti-rotation base
  "bs_landmine_rot_press",
  "bs_pallof_iso_hold",
  "bs_half_kneel_chop",
  "bs_half_kneel_lift",
];

// ---------------------------------------------------------------------------
// Elite Bat-Speed Selector — canonical session-shaping engine.
//
// Mirrors the Speed engine. A bat-speed session is never one movement: the
// rotational quality only transfers when the athlete moves through the full
// sequence
//
//   Prime → Potentiate → Contrast → Intent → Transfer
//
// This module is pure data (no I/O), so plans stay deterministically
// replayable. Progression state is read-only: it biases selection away from
// movements still inside their re-exposure window, but never authors truth.
// ---------------------------------------------------------------------------

import {
  resolveBatSpeedTemplate,
  type BatSpeedTemplate,
  type BatSpeedTemplateResolutionInput,
} from "../batSpeed/templates.ts";
import type { BatSpeedCategory } from "../batSpeed/movementCategories.ts";
import {
  isInReExposureWindow,
  type ProgressionState,
} from "../progression/progressionState.ts";

/** The five constitutional stages of an elite rotational session. */
export type BatSpeedStage = "prime" | "potentiate" | "contrast" | "intent" | "transfer";

export const BAT_SPEED_STAGE_ORDER: readonly BatSpeedStage[] = [
  "prime",
  "potentiate",
  "contrast",
  "intent",
  "transfer",
];

export const BAT_SPEED_STAGE_LABEL: Record<BatSpeedStage, string> = {
  prime: "Prime",
  potentiate: "Potentiate",
  contrast: "Contrast",
  intent: "Intent",
  transfer: "Transfer",
};

export const BAT_SPEED_STAGE_PURPOSE: Record<BatSpeedStage, string> = {
  prime: "Open the hips and separate pelvis from ribcage so the swing has something to sequence into.",
  potentiate: "Wake the rotational chain up with force before you ask it for speed.",
  contrast: "Overload then underload the same pattern — the contrast is what moves bat speed.",
  intent: "Swing at true max intent with feedback. This is the number the block is chasing.",
  transfer: "Take the new speed into a swing that looks like the game, or cool the pattern down.",
};

/** Which catalog categories may fill each stage, in preference order. */
const STAGE_CATEGORIES: Record<BatSpeedStage, readonly BatSpeedCategory[]> = {
  prime: ["pvc", "band", "elastic_rotation"],
  potentiate: ["med_ball", "rotational_strength", "pap"],
  contrast: ["overload", "heavy_implement", "underload", "light_implement"],
  intent: ["underload", "light_implement", "elastic_rotation"],
  transfer: ["elastic_rotation", "recovery_swing", "med_ball", "band"],
};

/** Minimum / maximum item counts by day kind. Elite sessions are never 1 item. */
export interface BatSpeedShapeFloor {
  readonly min: number;
  readonly max: number;
  readonly stages: readonly BatSpeedStage[];
}

export function batSpeedShapeFloor(args: {
  isGameDay: boolean;
  isRecoveryDay: boolean;
  isDeloadWeek: boolean;
  trainingAgeClass?: string;
}): BatSpeedShapeFloor {
  if (args.isGameDay) {
    return { min: 2, max: 3, stages: ["prime", "potentiate", "transfer"] };
  }
  if (args.isRecoveryDay) {
    return { min: 2, max: 3, stages: ["prime", "transfer"] };
  }
  const beginner = (args.trainingAgeClass ?? "").toLowerCase().includes("begin") ||
    (args.trainingAgeClass ?? "").toLowerCase().includes("youth");
  if (beginner) {
    return { min: 3, max: 4, stages: ["prime", "potentiate", "intent", "transfer"] };
  }
  if (args.isDeloadWeek) {
    return { min: 3, max: 4, stages: ["prime", "potentiate", "intent", "transfer"] };
  }
  return { min: 4, max: 6, stages: BAT_SPEED_STAGE_ORDER };
}

export interface BatSpeedCatalogRow {
  slug: string;
  name: string;
  category?: string | null;
  bat_speed_category?: string | null;
  pap_classification?: string | null;
  cns_cost?: number | null;
  substitution_family?: string | null;
  transfer_group?: string | null;
  default_sets?: number | null;
  default_reps?: number | null;
  default_total_reps?: number | null;
  default_duration_seconds?: number | null;
  dosage_unit?: string | null;
}

export interface SelectBatSpeedInput {
  catalog: readonly BatSpeedCatalogRow[];
  template: BatSpeedTemplateResolutionInput;
  eligible: (m: BatSpeedCatalogRow) => boolean;
  dayOfYearSeed: number;
  cnsBudget: number;
  progression: ProgressionState;
  isGameDay: boolean;
  isRecoveryDay: boolean;
  trainingAgeClass?: string;
}

export interface BatSpeedPick {
  movement: BatSpeedCatalogRow;
  category: string;
  stage: BatSpeedStage;
  required: boolean;
  reason: string;
}

export interface BatSpeedSelectionResult {
  template: BatSpeedTemplate;
  picks: BatSpeedPick[];
  shape: BatSpeedShapeFloor;
  cnsUsed: number;
  warnings: string[];
}

function rotate<T>(arr: readonly T[], seed: number): T[] {
  if (arr.length === 0) return [];
  const off = ((seed % arr.length) + arr.length) % arr.length;
  return [...arr.slice(off), ...arr.slice(0, off)];
}

function orderCandidates(
  pool: BatSpeedCatalogRow[],
  seed: number,
  progression: ProgressionState,
): BatSpeedCatalogRow[] {
  const prefIndex = new Map(BAT_SPEED_PREFERRED.map((s, i) => [s, i]));
  const preferred = pool
    .filter((m) => prefIndex.has(m.slug))
    .sort((a, b) => prefIndex.get(a.slug)! - prefIndex.get(b.slug)!);
  const rest = rotate(pool.filter((m) => !prefIndex.has(m.slug)), seed);
  const ordered = [...preferred, ...rest];
  // Push anything still resting to the back rather than dropping it — a
  // stale-but-legal movement always beats an empty stage.
  const fresh = ordered.filter((m) => !isInReExposureWindow(progression, m.slug, m.bat_speed_category));
  const resting = ordered.filter((m) => isInReExposureWindow(progression, m.slug, m.bat_speed_category));
  return [...fresh, ...resting];
}

export function selectBatSpeedPicks(input: SelectBatSpeedInput): BatSpeedSelectionResult {
  const template = resolveBatSpeedTemplate(input.template);
  const warnings: string[] = [];
  const shape = batSpeedShapeFloor({
    isGameDay: input.isGameDay,
    isRecoveryDay: input.isRecoveryDay,
    isDeloadWeek: input.progression.isDeloadWeek,
    trainingAgeClass: input.trainingAgeClass,
  });

  const pool = input.catalog.filter(
    (m) => (m.category === "bat_speed" || m.bat_speed_category != null) && input.eligible(m),
  );

  const used = new Set<string>();
  const usedFamilies = new Set<string>();
  const picks: BatSpeedPick[] = [];
  let cnsUsed = 0;
  const cnsBudget = Math.max(2, input.cnsBudget);

  const takeForStage = (stage: BatSpeedStage, required: boolean): boolean => {
    const cats = STAGE_CATEGORIES[stage];
    for (const cat of cats) {
      const inCat = pool.filter((m) => (m.bat_speed_category ?? "") === cat && !used.has(m.slug));
      if (inCat.length === 0) continue;
      const ordered = orderCandidates(inCat, input.dayOfYearSeed + stage.length, input.progression);
      const candidate =
        ordered.find((m) => {
          const fam = m.substitution_family ?? m.transfer_group ?? null;
          return !fam || !usedFamilies.has(fam);
        }) ?? ordered[0];
      if (!candidate) continue;
      const cost = candidate.cns_cost ?? 1;
      if (!required && cnsUsed + cost > cnsBudget) continue;
      used.add(candidate.slug);
      const fam = candidate.substitution_family ?? candidate.transfer_group ?? null;
      if (fam) usedFamilies.add(fam);
      cnsUsed += cost;
      picks.push({
        movement: candidate,
        category: cat,
        stage,
        required,
        reason: BAT_SPEED_STAGE_PURPOSE[stage],
      });
      return true;
    }
    if (required) warnings.push(`bat_speed_stage_unfilled:${stage}`);
    return false;
  };

  // 1) Template-required categories are constitutional — fill them first by
  //    mapping each back to the stage that owns it.
  for (const cat of template.requiredCategories) {
    const stage = BAT_SPEED_STAGE_ORDER.find((s) => STAGE_CATEGORIES[s].includes(cat)) ?? "intent";
    if (picks.some((p) => p.category === cat)) continue;
    const inCat = pool.filter((m) => (m.bat_speed_category ?? "") === cat && !used.has(m.slug));
    const ordered = orderCandidates(inCat, input.dayOfYearSeed, input.progression);
    const candidate = ordered[0];
    if (!candidate) {
      warnings.push(`bat_speed_missing_required:${cat}`);
      continue;
    }
    used.add(candidate.slug);
    const fam = candidate.substitution_family ?? candidate.transfer_group ?? null;
    if (fam) usedFamilies.add(fam);
    cnsUsed += candidate.cns_cost ?? 1;
    picks.push({
      movement: candidate,
      category: cat,
      stage,
      required: true,
      reason: `Required by ${template.displayName}. ${BAT_SPEED_STAGE_PURPOSE[stage]}`,
    });
  }

  // 2) Walk the canonical stage sequence until the shape floor is satisfied.
  for (const stage of shape.stages) {
    if (picks.length >= shape.max) break;
    if (picks.some((p) => p.stage === stage)) continue;
    takeForStage(stage, picks.length < shape.min);
  }

  // 3) Still short of the floor? Backfill from any unused stage, ignoring the
  //    CNS soft cap only up to the minimum — the floor is what makes the
  //    session a session.
  let guard = 0;
  while (picks.length < shape.min && guard++ < 12) {
    const before = picks.length;
    for (const stage of BAT_SPEED_STAGE_ORDER) {
      if (picks.length >= shape.min) break;
      takeForStage(stage, true);
    }
    if (picks.length === before) break;
  }

  if (picks.length < shape.min) {
    warnings.push(`bat_speed_below_floor:${picks.length}/${shape.min}`);
  }

  // 4) Emit in canonical stage order so the card reads as a session.
  picks.sort(
    (a, b) => BAT_SPEED_STAGE_ORDER.indexOf(a.stage) - BAT_SPEED_STAGE_ORDER.indexOf(b.stage),
  );

  return { template, picks, shape, cnsUsed, warnings };
}
