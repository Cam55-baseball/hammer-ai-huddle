// Phase 9 — Canonical Speed Templates
// Every Speed session resolves EXACTLY ONE template before selection.
// Templates are deterministic. No shortcut paths.

import type { SpeedCategory } from "./movementCategories.ts";

export type SpeedTemplateId =
  | "speed.acceleration"
  | "speed.top_speed"
  | "speed.mixed"
  | "speed.elastic"
  | "speed.game_day_primer"
  | "speed.practice_day"
  | "speed.recovery"
  | "speed.return_to_run";

export interface SpeedTemplate {
  id: SpeedTemplateId;
  displayName: string;
  requiredCategories: readonly SpeedCategory[];
  optionalCategories: readonly SpeedCategory[];
  categoryOrder: readonly SpeedCategory[];
  /** 0..1 share of daily CNS budget the Speed block may consume. */
  cnsBudget: number;
  /** 0..1 potentiation cost the block is allowed to incur. */
  papBudget: number;
  /** 0..1 emphasis weights (used by validators + explainability). */
  accelerationEmphasis: number;
  topSpeedEmphasis: number;
  recoveryBudget: number;
}

const CANONICAL_ORDER: readonly SpeedCategory[] = [
  "mobility",
  "pap",
  "acceleration",
  "resisted",
  "top_speed",
  "overspeed",
  "elastic",
  "plyometric",
  "reactive",
  "change_of_direction",
  "deceleration",
];

export const SPEED_TEMPLATES: Record<SpeedTemplateId, SpeedTemplate> = {
  "speed.acceleration": {
    id: "speed.acceleration",
    displayName: "Acceleration Development",
    requiredCategories: ["acceleration"],
    optionalCategories: ["resisted", "pap", "mobility", "plyometric"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.55,
    papBudget: 0.6,
    accelerationEmphasis: 1.0,
    topSpeedEmphasis: 0.1,
    recoveryBudget: 0.1,
  },
  "speed.top_speed": {
    id: "speed.top_speed",
    displayName: "Top-Speed Development",
    requiredCategories: ["top_speed"],
    optionalCategories: ["acceleration", "mobility", "elastic", "pap"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.6,
    papBudget: 0.45,
    accelerationEmphasis: 0.2,
    topSpeedEmphasis: 1.0,
    recoveryBudget: 0.1,
  },
  "speed.mixed": {
    id: "speed.mixed",
    displayName: "Mixed Acceleration + Top Speed",
    requiredCategories: ["acceleration", "top_speed"],
    optionalCategories: ["mobility", "elastic", "pap"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.6,
    papBudget: 0.5,
    accelerationEmphasis: 0.6,
    topSpeedEmphasis: 0.6,
    recoveryBudget: 0.1,
  },
  "speed.elastic": {
    id: "speed.elastic",
    displayName: "Elastic / Reactive Speed",
    requiredCategories: ["elastic"],
    optionalCategories: ["plyometric", "reactive", "acceleration", "mobility"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.4,
    papBudget: 0.3,
    accelerationEmphasis: 0.3,
    topSpeedEmphasis: 0.2,
    recoveryBudget: 0.15,
  },
  "speed.game_day_primer": {
    id: "speed.game_day_primer",
    displayName: "Game-Day Speed Primer",
    requiredCategories: ["acceleration"],
    optionalCategories: ["mobility", "reactive"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.15,
    papBudget: 0.1,
    accelerationEmphasis: 0.7,
    topSpeedEmphasis: 0.2,
    recoveryBudget: 0.2,
  },
  "speed.practice_day": {
    id: "speed.practice_day",
    displayName: "Practice-Day Speed",
    requiredCategories: ["acceleration"],
    optionalCategories: ["change_of_direction", "reactive", "mobility"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.3,
    papBudget: 0.2,
    accelerationEmphasis: 0.6,
    topSpeedEmphasis: 0.2,
    recoveryBudget: 0.2,
  },
  "speed.recovery": {
    id: "speed.recovery",
    displayName: "Speed Recovery",
    requiredCategories: ["mobility"],
    optionalCategories: ["reactive"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.1,
    papBudget: 0.05,
    accelerationEmphasis: 0.1,
    topSpeedEmphasis: 0.05,
    recoveryBudget: 1.0,
  },
  "speed.return_to_run": {
    id: "speed.return_to_run",
    displayName: "Return-to-Run (structure only)",
    requiredCategories: ["mobility"],
    optionalCategories: ["acceleration"],
    categoryOrder: CANONICAL_ORDER,
    cnsBudget: 0.15,
    papBudget: 0.1,
    accelerationEmphasis: 0.3,
    topSpeedEmphasis: 0.0,
    recoveryBudget: 0.6,
  },
};

export interface SpeedTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  trainingAge?: string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isPracticeDay?: boolean;
  isRecoveryDay?: boolean;
  isReturnToPlay?: boolean;
}

export function resolveSpeedTemplate(
  input: SpeedTemplateResolutionInput,
): SpeedTemplate {
  if (input.isReturnToPlay) return SPEED_TEMPLATES["speed.return_to_run"];
  if (input.isRecoveryDay || input.dayType === "recovery") {
    return SPEED_TEMPLATES["speed.recovery"];
  }
  if (input.isGameDay) return SPEED_TEMPLATES["speed.game_day_primer"];
  if (input.isPracticeDay || input.dayType === "practice") {
    return SPEED_TEMPLATES["speed.practice_day"];
  }

  const adapt = (input.primaryAdaptation ?? "").toLowerCase();
  if (adapt.includes("elastic")) return SPEED_TEMPLATES["speed.elastic"];
  if (adapt.includes("top_speed") || adapt.includes("top speed")) {
    return SPEED_TEMPLATES["speed.top_speed"];
  }
  if (adapt.includes("mixed")) return SPEED_TEMPLATES["speed.mixed"];

  // Default training day = acceleration.
  return SPEED_TEMPLATES["speed.acceleration"];
}
