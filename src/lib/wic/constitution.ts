// Client-side mirror of the Workout Intelligence Constitution (WIC).
// Keep in lockstep with supabase/functions/_shared/wic/*.

export const WIC_VERSION = "wic_v1";

export const WIC_PRIORITY = [
  "athlete_safety",
  "recovery_state",
  "medical_restrictions",
  "schedule_context",
  "seasonal_phase",
  "cns_readiness",
  "development_objective",
  "position_demands",
  "training_age",
  "movement_quality",
  "strength_deficiencies",
  "speed_deficiencies",
  "bat_speed_deficiencies",
  "throwing_hitting_workload",
  "available_equipment",
  "available_time",
] as const;

export type WicPriorityLayer = (typeof WIC_PRIORITY)[number];

export const WIC_ENGINES = [
  "movement_prep",
  "warmup",
  "sprint",
  "bat_speed",
  "strength",
  "power",
  "conditioning",
  "cross_sport",
  "recovery",
  "arm_care",
  "mobility",
  "return_to_play",
] as const;

export type WicEngine = (typeof WIC_ENGINES)[number];

export type PrimaryAdaptation =
  | "recovery_only"
  | "game_readiness"
  | "muscle_capacity"
  | "max_strength"
  | "strength_to_power"
  | "power_transfer"
  | "in_season_maintenance"
  | "speed_development"
  | "bat_speed_development"
  | "conditioning_repeat_explosive"
  | "movement_literacy";

// The six constitutional questions every prescription must answer.
export interface WhyV2 {
  why_today: string;
  why_athlete: string;
  why_exercise: string;
  why_volume: string;
  why_order: string;
  why_recovery: string;
  adaptation: PrimaryAdaptation;
  engine: WicEngine;
  generator_version: string;
}

export function whyIsComplete(w: WhyV2 | null | undefined): boolean {
  if (!w) return false;
  return !!(w.why_today && w.why_athlete && w.why_exercise && w.why_volume && w.why_order && w.why_recovery);
}

// Canonical rendering order for daily plan cards.
export const NORMAL_DAY_ORDER: WicEngine[] = [
  "movement_prep",
  "warmup",
  "sprint",
  "bat_speed",
  "power",
  "strength",
  "conditioning",
  "recovery",
  "mobility",
  "arm_care",
  "cross_sport",
];

export const GAME_DAY_ORDER: WicEngine[] = [
  "movement_prep",
  "cross_sport",
  "sprint",
  "bat_speed",
  "recovery",
];
