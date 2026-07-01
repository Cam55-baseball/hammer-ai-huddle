// Phase 9 — Canonical Bat Speed Templates

import type { BatSpeedCategory } from "./movementCategories.ts";

export type BatSpeedTemplateId =
  | "bs.max"
  | "bs.elastic"
  | "bs.overload"
  | "bs.underload"
  | "bs.mixed_pap"
  | "bs.game_day_primer"
  | "bs.recovery"
  | "bs.return_to_swing";

export interface BatSpeedTemplate {
  id: BatSpeedTemplateId;
  displayName: string;
  requiredCategories: readonly BatSpeedCategory[];
  optionalCategories: readonly BatSpeedCategory[];
  categoryOrder: readonly BatSpeedCategory[];
  overloadBudget: number;    // 0..1
  underloadBudget: number;   // 0..1
  papBudget: number;         // 0..1
  rotationalDemand: number;  // 0..1
  recoveryBudget: number;    // 0..1
}

const CANONICAL_ORDER: readonly BatSpeedCategory[] = [
  "pvc",
  "band",
  "med_ball",
  "pap",
  "overload",
  "heavy_implement",
  "rotational_strength",
  "elastic_rotation",
  "underload",
  "light_implement",
  "recovery_swing",
];

export const BAT_SPEED_TEMPLATES: Record<BatSpeedTemplateId, BatSpeedTemplate> = {
  "bs.max": {
    id: "bs.max",
    displayName: "Maximum Bat Speed",
    requiredCategories: ["elastic_rotation"],
    optionalCategories: ["med_ball", "band", "pap", "light_implement"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0.2,
    underloadBudget: 0.4,
    papBudget: 0.5,
    rotationalDemand: 1.0,
    recoveryBudget: 0.1,
  },
  "bs.elastic": {
    id: "bs.elastic",
    displayName: "Elastic Bat Speed",
    requiredCategories: ["elastic_rotation"],
    optionalCategories: ["band", "med_ball", "pvc"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0.1,
    underloadBudget: 0.3,
    papBudget: 0.35,
    rotationalDemand: 0.8,
    recoveryBudget: 0.15,
  },
  "bs.overload": {
    id: "bs.overload",
    displayName: "Overload Rotational",
    requiredCategories: ["overload"],
    optionalCategories: ["heavy_implement", "rotational_strength", "med_ball"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 1.0,
    underloadBudget: 0.1,
    papBudget: 0.55,
    rotationalDemand: 0.9,
    recoveryBudget: 0.1,
  },
  "bs.underload": {
    id: "bs.underload",
    displayName: "Underload Overspeed",
    requiredCategories: ["underload"],
    optionalCategories: ["light_implement", "elastic_rotation", "band"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0.1,
    underloadBudget: 1.0,
    papBudget: 0.4,
    rotationalDemand: 0.9,
    recoveryBudget: 0.1,
  },
  "bs.mixed_pap": {
    id: "bs.mixed_pap",
    displayName: "Mixed Over/Underload PAP",
    requiredCategories: ["overload", "underload"],
    optionalCategories: ["pap", "med_ball", "elastic_rotation"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0.6,
    underloadBudget: 0.6,
    papBudget: 0.65,
    rotationalDemand: 1.0,
    recoveryBudget: 0.1,
  },
  "bs.game_day_primer": {
    id: "bs.game_day_primer",
    displayName: "Game-Day Swing Primer",
    requiredCategories: ["elastic_rotation"],
    optionalCategories: ["pvc", "band"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0.05,
    underloadBudget: 0.1,
    papBudget: 0.1,
    rotationalDemand: 0.5,
    recoveryBudget: 0.2,
  },
  "bs.recovery": {
    id: "bs.recovery",
    displayName: "Rotational Recovery",
    requiredCategories: ["recovery_swing"],
    optionalCategories: ["pvc"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0,
    underloadBudget: 0,
    papBudget: 0.05,
    rotationalDemand: 0.2,
    recoveryBudget: 1.0,
  },
  "bs.return_to_swing": {
    id: "bs.return_to_swing",
    displayName: "Return-to-Swing (structure only)",
    requiredCategories: ["pvc"],
    optionalCategories: ["band", "elastic_rotation"],
    categoryOrder: CANONICAL_ORDER,
    overloadBudget: 0,
    underloadBudget: 0.1,
    papBudget: 0.1,
    rotationalDemand: 0.3,
    recoveryBudget: 0.6,
  },
};

export interface BatSpeedTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  trainingAge?: string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isRecoveryDay?: boolean;
  isReturnToPlay?: boolean;
}

export function resolveBatSpeedTemplate(
  input: BatSpeedTemplateResolutionInput,
): BatSpeedTemplate {
  if (input.isReturnToPlay) return BAT_SPEED_TEMPLATES["bs.return_to_swing"];
  if (input.isRecoveryDay || input.dayType === "recovery") {
    return BAT_SPEED_TEMPLATES["bs.recovery"];
  }
  if (input.isGameDay) return BAT_SPEED_TEMPLATES["bs.game_day_primer"];

  const adapt = (input.primaryAdaptation ?? "").toLowerCase();
  if (adapt.includes("overload")) return BAT_SPEED_TEMPLATES["bs.overload"];
  if (adapt.includes("underload")) return BAT_SPEED_TEMPLATES["bs.underload"];
  if (adapt.includes("mixed")) return BAT_SPEED_TEMPLATES["bs.mixed_pap"];
  if (adapt.includes("elastic")) return BAT_SPEED_TEMPLATES["bs.elastic"];

  const phase = (input.seasonPhase ?? "").toLowerCase();
  if (phase === "in_season" || phase.startsWith("in_season")) {
    return BAT_SPEED_TEMPLATES["bs.elastic"];
  }

  return BAT_SPEED_TEMPLATES["bs.max"];
}
