// Adaptation-first selector. The engine determines *what physiological
// adaptation* the day is targeting before any exercise is chosen. If the
// selector cannot produce a defensible adaptation, generation aborts.

import type { WkPhase } from "../wkPhaseQuarter.ts";

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

export interface AdaptationContext {
  phase: WkPhase;
  isGameDay: boolean;
  isPracticeDay: boolean;
  cnsReadiness: number; // 1..10
  sleepHours: number;
  soreness: number; // 1..10
  ageYears: number | null;
  trainingAgeYears: number;
  hoursSinceSpeed: number;
  hoursSinceLift: number;
  injuriesActive: boolean;
}

export interface AdaptationDecision {
  primary: PrimaryAdaptation;
  reason: string; // Why today
  reason_athlete: string; // Why this athlete
  suppressed: string[]; // engines suppressed by this decision
}

export function selectAdaptation(ctx: AdaptationContext): AdaptationDecision {
  // Safety layer — highest priority.
  if (ctx.injuriesActive && ctx.soreness >= 8) {
    return {
      primary: "recovery_only",
      reason: "Active injury + high soreness — safety layer blocks loading.",
      reason_athlete: "Your body is asking for repair, not stimulus.",
      suppressed: ["sprint", "strength", "power", "conditioning", "cross_sport", "bat_speed"],
    };
  }

  // Schedule layer — game day.
  if (ctx.isGameDay) {
    return {
      primary: "game_readiness",
      reason: "Competition today — CNS reserved for game.",
      reason_athlete: "Prime the nervous system, then compete.",
      suppressed: ["strength", "power", "conditioning", "mobility", "arm_care"],
    };
  }

  // Youth override — movement literacy dominates below 8 lifting-age.
  if ((ctx.ageYears ?? 99) < 8) {
    return {
      primary: "movement_literacy",
      reason: "Athlete is pre-strength-training age — coordination + play win.",
      reason_athlete: "You build the athlete before the lifter.",
      suppressed: ["strength", "power"],
    };
  }

  // Recovery layer — CNS or sleep insufficient.
  if (ctx.cnsReadiness <= 3 || ctx.sleepHours < 5) {
    return {
      primary: "recovery_only",
      reason: "CNS readiness or sleep below threshold — deload.",
      reason_athlete: "Recovery is the workout today.",
      suppressed: ["sprint", "strength", "power", "conditioning"],
    };
  }

  // Seasonal layer.
  switch (ctx.phase) {
    case "os_q1":
      return {
        primary: "muscle_capacity",
        reason: "Early offseason — build capacity + eccentric tolerance.",
        reason_athlete: "Layer tissue that survives the season.",
        suppressed: [],
      };
    case "os_q2":
      return {
        primary: "max_strength",
        reason: "Mid offseason — max force with eccentric bias.",
        reason_athlete: "Peak strength window; own the eccentric.",
        suppressed: [],
      };
    case "os_q3":
      return {
        primary: "strength_to_power",
        reason: "Late offseason — convert strength into elastic power.",
        reason_athlete: "Turn strength into speed.",
        suppressed: [],
      };
    case "os_q4":
      return {
        primary: "power_transfer",
        reason: "Preseason — power transfer, bat speed, game-speed intent.",
        reason_athlete: "Sharpen. Lower volume, higher intent.",
        suppressed: [],
      };
    case "in_season":
      return {
        primary: "in_season_maintenance",
        reason: "In-season — maintain strength/power/speed, stay fresh.",
        reason_athlete: "Freshness > fatigue. Concentric bias only.",
        suppressed: [],
      };
    case "post_season":
      return {
        primary: "recovery_only",
        reason: "Post-season — decompress and repair.",
        reason_athlete: "Earned rest is part of the program.",
        suppressed: ["strength", "power", "sprint", "conditioning"],
      };
  }
}
