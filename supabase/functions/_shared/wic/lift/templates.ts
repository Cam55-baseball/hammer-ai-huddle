// Phase 8 — Canonical Lift Templates
// Every lift session resolves EXACTLY ONE template before selection.
// Templates are deterministic. There is no lower-body-only default.

import type { MovementCategory } from "./movementCategories.ts";

export type LiftTemplateId =
  | "full_body_strength"
  | "full_body_power"
  | "full_body_force_production"
  | "full_body_elastic_strength"
  | "full_body_in_season_maintenance"
  | "full_body_recovery"
  | "full_body_return_to_play";

export interface LiftTemplate {
  id: LiftTemplateId;
  displayName: string;
  /** Categories that MUST appear in a legal lift session. */
  requiredCategories: readonly MovementCategory[];
  /** Categories that MAY appear (used for coverage bonus, not required). */
  optionalCategories: readonly MovementCategory[];
  /** Canonical ordering priority — first category gets earliest sequence. */
  categoryOrder: readonly MovementCategory[];
  /** Dose envelope for compound movements (sets range). */
  compoundSets: [number, number];
  /** Rep envelope for compound movements. */
  compoundReps: [number, number];
  /** Share of daily CNS budget the lift block may consume (0..1). */
  cnsShare: number;
  /** Primary adaptation this template serves. */
  adaptation: "strength" | "power" | "force" | "elastic" | "maintenance" | "recovery" | "rtp";
}

const CORE_FULL_BODY: readonly MovementCategory[] = [
  "compound_lower",
  "compound_upper_push",
  "compound_upper_pull",
  "core",
  "rotation",
];

const CANONICAL_ORDER: readonly MovementCategory[] = [
  "compound_lower",
  "posterior_chain",
  "compound_upper_push",
  "compound_upper_pull",
  "single_leg",
  "rotation",
  "anti_rotation",
  "core",
  "carry",
  "arm_care",
  "jump_landing",
  "hip",
  "shoulder",
  "foot_ankle",
  "mobility",
];

export const LIFT_TEMPLATES: Record<LiftTemplateId, LiftTemplate> = {
  full_body_strength: {
    id: "full_body_strength",
    displayName: "Full-Body Strength",
    requiredCategories: CORE_FULL_BODY,
    optionalCategories: ["posterior_chain", "single_leg", "carry", "arm_care"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [3, 5],
    compoundReps: [3, 6],
    cnsShare: 0.55,
    adaptation: "strength",
  },
  full_body_power: {
    id: "full_body_power",
    displayName: "Full-Body Power",
    requiredCategories: CORE_FULL_BODY,
    optionalCategories: ["jump_landing", "posterior_chain", "single_leg", "arm_care"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [3, 5],
    compoundReps: [2, 4],
    cnsShare: 0.6,
    adaptation: "power",
  },
  full_body_force_production: {
    id: "full_body_force_production",
    displayName: "Full-Body Force Production",
    requiredCategories: CORE_FULL_BODY,
    optionalCategories: ["posterior_chain", "single_leg", "carry", "jump_landing", "arm_care"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [4, 6],
    compoundReps: [1, 3],
    cnsShare: 0.65,
    adaptation: "force",
  },
  full_body_elastic_strength: {
    id: "full_body_elastic_strength",
    displayName: "Full-Body Elastic Strength",
    requiredCategories: CORE_FULL_BODY,
    optionalCategories: ["jump_landing", "single_leg", "posterior_chain", "arm_care"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [3, 4],
    compoundReps: [3, 5],
    cnsShare: 0.5,
    adaptation: "elastic",
  },
  full_body_in_season_maintenance: {
    id: "full_body_in_season_maintenance",
    displayName: "Full-Body In-Season Maintenance",
    requiredCategories: CORE_FULL_BODY,
    optionalCategories: ["single_leg", "arm_care", "mobility"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [2, 3],
    compoundReps: [3, 6],
    cnsShare: 0.35,
    adaptation: "maintenance",
  },
  full_body_recovery: {
    id: "full_body_recovery",
    displayName: "Full-Body Recovery",
    requiredCategories: ["core", "mobility"],
    optionalCategories: ["arm_care", "hip", "shoulder", "foot_ankle"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [1, 2],
    compoundReps: [8, 12],
    cnsShare: 0.2,
    adaptation: "recovery",
  },
  full_body_return_to_play: {
    id: "full_body_return_to_play",
    displayName: "Full-Body Return-to-Play",
    // Structure only — not activated by resolver yet; kept for future RTP flow.
    requiredCategories: ["core", "hip", "shoulder"],
    optionalCategories: ["mobility", "single_leg", "arm_care", "foot_ankle"],
    categoryOrder: CANONICAL_ORDER,
    compoundSets: [1, 2],
    compoundReps: [6, 10],
    cnsShare: 0.15,
    adaptation: "rtp",
  },
};

export interface TemplateResolutionInput {
  seasonPhase: string; // canonical phase id (os_q1..in_season..post_season..rtp)
  dayType?: string;    // canonical day type (train/recovery/game/travel/…)
  trainingAge?: "beginner" | "developing" | "intermediate" | "advanced" | "elite" | "pro" | string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isRecoveryDay?: boolean;
  isReturnToPlay?: boolean;
}

/**
 * Resolve exactly one template deterministically from constitutional context.
 * Never returns null — the caller must always have a template if lifts are
 * being generated.
 */
export function resolveLiftTemplate(input: TemplateResolutionInput): LiftTemplate {
  if (input.isReturnToPlay) return LIFT_TEMPLATES.full_body_return_to_play;
  if (input.isRecoveryDay || input.dayType === "recovery") return LIFT_TEMPLATES.full_body_recovery;

  const phase = (input.seasonPhase ?? "").toLowerCase();
  const inSeason = phase === "in_season" || phase.startsWith("in_season");
  if (inSeason || input.isGameDay) return LIFT_TEMPLATES.full_body_in_season_maintenance;

  // Adaptation-driven selection for training days.
  const adapt = (input.primaryAdaptation ?? "").toLowerCase();
  if (adapt.includes("power")) return LIFT_TEMPLATES.full_body_power;
  if (adapt.includes("force")) return LIFT_TEMPLATES.full_body_force_production;
  if (adapt.includes("elastic")) return LIFT_TEMPLATES.full_body_elastic_strength;

  // Default off-season training day → strength.
  return LIFT_TEMPLATES.full_body_strength;
}
