// WIC Strength Engine
// Owns the full-body role pool for the "strength" engine block.
// Slug lists are the single source of truth; the composer picks the
// first eligible movement from each role list based on the athlete's
// season / training-age gates (encoded on each wk_movement_catalog row).
//
// Doctrine ordering per role:
//   1. weekly-rotation lead slug (M/W/F variety)
//   2. tier-preferred slugs for that athlete's training age
//   3. broad fallback pool so the certifier always has an option
//
// Preferred families and their doctrine sources:
//   - Westside / Prilepin / Sheiko max-strength
//   - Olympic weightlifting / Cal Dietz Triphasic power
//   - Cressey / Boyle / Simmons posterior-chain & hip power
//   - Ben Patrick (KOT) / Kelly Starrett durability
//   - Cressey Sports Performance / Driveline upper push/pull
//   - StrongFirst / DNS / FMS carries and anti-rotation

import type { WkPhase } from "../../wkPhaseQuarter.ts";

export type StrengthRole =
  | "arm_care"
  | "trunk_primer"
  | "compound_lower"
  | "unilateral_lower"
  | "upper_push"
  | "upper_pull"
  | "carry_antirotation"
  | "trunk_finisher";

export interface StrengthDose { sets: number; reps: number; }

// ─── Compound lower ──────────────────────────────────────────────────────────
// Wave M/W/F across squat / hinge / power. In-season stays hinge-dominant and
// avoids max-effort. Q1/Q2 (early offseason) gets the heaviest ME wave.
export function compoundSlugsFor(phase: WkPhase, dayOfWeek: number = 0): string[] {
  const inSeason = phase === "in_season";
  const earlyOff = phase === "os_q1" || phase === "os_q2";
  const lateOff = phase === "os_q3" || phase === "os_q4";

  if (inSeason) {
    // In-season: lead with a true compound_lower so the generator and
    // certifier agree before rotating into posterior-chain maintenance.
    return [
      "goblet_squat",
      "back_squat_concentric",
      "hip_thrust_concentric",
      "lift_bb_hip_thrust",
      "lift_sl_hip_thrust",
      "lift_heavy_sled_march",
      "lift_snatch_grip_rdl",
      "rdl_concentric",
    ];
  }

  if (earlyOff) {
    // ME/DE Westside wave: Mon = ME lower, Wed = DE speed, Fri = triple-ext
    const meDay = dayOfWeek % 3 === 0;
    const deDay = dayOfWeek % 3 === 1;
    if (meDay) {
      return [
        "lift_box_squat_wide",
        "lift_safety_bar_squat",
        "lift_anderson_squat",
        "lift_chain_deadlift",
        "lift_paused_front_squat",
        "back_squat_double_ecc",
        "front_squat_double_ecc",
      ];
    }
    if (deDay) {
      return [
        "lift_dynamic_effort_squat",
        "lift_band_deadlift",
        "lift_trap_bar_jump",
        "lift_hang_power_clean",
        "trap_bar_dl_double_ecc",
      ];
    }
    return [
      "lift_hang_power_clean",
      "lift_clean_pull",
      "lift_snatch_pull",
      "lift_jump_shrug",
      "lift_french_contrast_lower",
      "lift_tempo_back_squat",
    ];
  }

  if (lateOff) {
    // Late offseason: convert strength to power
    const powerDay = dayOfWeek % 2 === 0;
    if (powerDay) {
      return [
        "lift_hang_power_clean",
        "lift_hang_power_snatch",
        "lift_trap_bar_jump",
        "lift_box_jump_depth_drop",
        "lift_triphasic_iso_squat",
        "front_squat_double_ecc",
      ];
    }
    return [
      "lift_db_snatch",
      "lift_kb_clean_press",
      "lift_paused_front_squat",
      "lift_bb_hip_thrust",
      "hip_thrust_concentric",
      "back_squat_concentric",
    ];
  }

  // Pre-season / post-season fallback
  return [
    "goblet_squat",
    "lift_bb_hip_thrust",
    "hip_thrust_concentric",
    "lift_snatch_grip_rdl",
    "rdl_concentric",
    "back_squat_concentric",
  ];
}

// ─── Unilateral lower ────────────────────────────────────────────────────────
// KOT-forward for durability; single-leg RDL forward for sprint transfer.
export function unilateralSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const inSeason = [
    "lift_atg_split_squat",
    "lift_sl_rdl",
    "lift_staggered_rdl",
    "lift_poliquin_stepup",
    "lift_split_squat_iso",
    "lateral_db_step_up",
    "sl_deadlift_fat_grips",
  ];
  const offSeason = [
    "lift_atg_split_squat",
    "lift_sl_rdl",
    "lift_poliquin_stepup",
    "lift_peterson_stepup",
    "lift_patrick_step",
    "lift_kot_sissy_squat",
    "lift_staggered_rdl",
    "lateral_db_step_up",
    "kot_lunge",
    "slide_lunge",
    "sl_deadlift_fat_grips",
  ];
  const pool = isInSeason ? inSeason : offSeason;
  // Weekly rotation: cycle the lead slug by day-of-week
  const leadIdx = dayOfWeek % pool.length;
  return [pool[leadIdx], ...pool];
}

// ─── Upper push ──────────────────────────────────────────────────────────────
// Landmine and neutral-grip lead — Cressey shoulder-preservation doctrine.
export function upperPushSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const inSeason = [
    "lift_hk_landmine_press",
    "lift_landmine_press",
    "lift_weighted_pushup_chains",
    "lift_bottoms_up_kb_press",
    "push_press_concentric",
    "sa_db_chest_press",
    "db_bench",
  ];
  const offSeason = [
    "lift_landmine_press",
    "lift_hk_landmine_press",
    "lift_sa_db_bench",
    "lift_swiss_bar_bench",
    "lift_floor_press",
    "lift_pin_press",
    "lift_push_jerk",
    "lift_kb_clean_press",
    "lift_bottoms_up_kb_press",
    "lift_weighted_pushup_chains",
    "db_bench",
    "push_press_concentric",
    "bench_press_concentric",
    "sa_db_chest_press",
    "landmine_row_to_press",
  ];
  const pool = isInSeason ? inSeason : offSeason;
  const leadIdx = dayOfWeek % pool.length;
  return [pool[leadIdx], ...pool];
}

// ─── Upper pull ──────────────────────────────────────────────────────────────
// Horizontal pulling volume ≥ pressing — protect the shoulder.
export function upperPullSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const inSeason = [
    "lift_1arm_cable_row",
    "lift_ring_row",
    "lift_batwing_row",
    "lift_face_pull",
    "lift_band_pullapart",
    "sa_standing_cable_row",
    "lat_pulldown",
    "db_row_bench",
  ];
  const offSeason = [
    "lift_1arm_cable_row",
    "lift_chest_tbar_row",
    "lift_meadows_row",
    "lift_weighted_pullup_full",
    "lift_ring_row",
    "lift_batwing_row",
    "lift_high_pull",
    "lift_face_pull",
    "lift_band_pullapart",
    "sa_standing_cable_row",
    "lat_pulldown",
    "db_row_bench",
    "weighted_pullup_concentric",
    "renegade_row",
    "weighted_pullup_full",
  ];
  const pool = isInSeason ? inSeason : offSeason;
  const leadIdx = dayOfWeek % pool.length;
  return [pool[leadIdx], ...pool];
}

// ─── Arm care ────────────────────────────────────────────────────────────────
export const ARM_CARE_SLUGS = [
  "lift_face_pull",
  "lift_band_pullapart",
  "lift_er_at_90",
  "crossover_symmetry_full",
  "jband_full_chart",
];

// ─── Trunk primer ────────────────────────────────────────────────────────────
export const TRUNK_PRIMER_SLUGS = [
  "lift_hk_pallof_iso",
  "lift_deadbug_band_press",
  "lift_mcgill_big3",
  "trap_bar_trunk_twist",
  "paloff_press",
];

// ─── Trunk finisher ──────────────────────────────────────────────────────────
export const TRUNK_FINISHER_SLUGS = [
  "lift_ab_wheel_rollout",
  "lift_dragon_flag_prog",
  "lift_side_plank_leg_lift",
  "lift_copenhagen_plank",
  "heavy_russian_twist",
];

// ─── Carries / anti-rotation ─────────────────────────────────────────────────
export function carrySlugs(isInSeason: boolean, dayOfWeek: number = 0): string[] {
  const inSeason = [
    "lift_farmer_carry",
    "lift_suitcase_carry",
    "lift_hk_pallof_iso",
    "lift_rfess_pallof",
    "paloff_press",
    "standing_cable_hip_flexor",
  ];
  const offSeason = [
    "lift_farmer_carry",
    "lift_suitcase_carry",
    "lift_waiter_carry",
    "lift_front_rack_carry",
    "lift_mixed_carry",
    "lift_zercher_carry",
    "lift_turkish_getup",
    "lift_rfess_pallof",
    "lift_hk_pallof_iso",
    "waiter_carry",
    "standing_cable_hip_flexor",
    "paloff_press",
  ];
  const pool = isInSeason ? inSeason : offSeason;
  const leadIdx = dayOfWeek % pool.length;
  return [pool[leadIdx], ...pool];
}

// ─── Dose helpers ────────────────────────────────────────────────────────────
export function unilateralDose(isInSeason: boolean): StrengthDose {
  return { sets: isInSeason ? 1 : 2, reps: 3 };
}

export function upperDose(isInSeason: boolean): StrengthDose {
  return { sets: isInSeason ? 1 : 2, reps: 3 };
}

// ─── Westside ME/DE wave helper (exported for wk-generate-daily) ─────────────
// Returns the wave day for early-offseason: "me" | "de" | "power".
export function westsideWaveFor(dayOfWeek: number, phase: WkPhase): "me" | "de" | "power" | null {
  if (phase !== "os_q1" && phase !== "os_q2") return null;
  const mod = dayOfWeek % 3;
  if (mod === 0) return "me";
  if (mod === 1) return "de";
  return "power";
}
