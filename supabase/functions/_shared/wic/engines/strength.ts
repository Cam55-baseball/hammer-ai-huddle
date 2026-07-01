// WIC Strength Engine
// Owns the full-body role pool for the "strength" engine block.
// Slug lists are the single source of truth; the composer picks the
// first eligible movement from each role list.

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

export function compoundSlugsFor(phase: WkPhase): string[] {
  if (phase === "os_q1" || phase === "os_q2") {
    return ["back_squat_double_ecc", "front_squat_double_ecc", "trap_bar_dl_double_ecc"];
  }
  if (phase === "os_q3" || phase === "os_q4") {
    return ["front_squat_double_ecc", "hip_thrust_concentric", "back_squat_concentric"];
  }
  return ["goblet_squat", "hip_thrust_concentric", "rdl_concentric", "back_squat_concentric"];
}

export function unilateralSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const rot = isInSeason
    ? ["lateral_db_step_up", "sl_deadlift_fat_grips"]
    : ["lateral_db_step_up", "kot_lunge", "slide_lunge", "sl_deadlift_fat_grips"];
  return [rot[dayOfWeek % rot.length], ...rot];
}

export function upperPushSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const pick = isInSeason
    ? "push_press_concentric"
    : dayOfWeek % 2 === 0
      ? "sa_db_chest_press"
      : "landmine_row_to_press";
  return [pick, "db_bench", "push_press_concentric", "bench_press_concentric", "sa_db_chest_press", "landmine_row_to_press"];
}

export function upperPullSlugs(isInSeason: boolean, dayOfWeek: number): string[] {
  const pick = isInSeason
    ? "sa_standing_cable_row"
    : dayOfWeek % 3 === 0
      ? "renegade_row"
      : dayOfWeek % 3 === 1
        ? "sa_standing_cable_row"
        : "weighted_pullup_full";
  return [pick, "sa_standing_cable_row", "lat_pulldown", "db_row_bench", "weighted_pullup_concentric", "renegade_row", "weighted_pullup_full"];
}

export const ARM_CARE_SLUGS = ["crossover_symmetry_full", "jband_full_chart"];
export const TRUNK_PRIMER_SLUGS = ["trap_bar_trunk_twist", "paloff_press"];
export const TRUNK_FINISHER_SLUGS = ["heavy_russian_twist"];
export function carrySlugs(isInSeason: boolean): string[] {
  return isInSeason
    ? ["paloff_press", "standing_cable_hip_flexor"]
    : ["waiter_carry", "standing_cable_hip_flexor", "paloff_press"];
}

export function unilateralDose(isInSeason: boolean): StrengthDose {
  return { sets: isInSeason ? 1 : 2, reps: 3 };
}

export function upperDose(isInSeason: boolean): StrengthDose {
  return { sets: isInSeason ? 1 : 2, reps: 3 };
}
