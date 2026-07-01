// Phase 10 — Canonical Cross-Sport Templates

import type { CrossSportCategory } from "./movementCategories.ts";

export type CrossSportTemplateId =
  | "xs.fascial_rotation"
  | "xs.footwork"
  | "xs.explosive_transfer"
  | "xs.recovery_transfer"
  | "xs.balance_transfer"
  | "xs.visual_reaction"
  | "xs.reflex"
  | "xs.coordination"
  | "xs.rotational_power"
  | "xs.low_impact";

export interface CrossSportTemplate {
  id: CrossSportTemplateId;
  displayName: string;
  requiredCategories: readonly CrossSportCategory[];
  optionalCategories: readonly CrossSportCategory[];
  cnsBudget: number;
  timeBudgetMin: number;
}

export const CROSS_SPORT_TEMPLATES: Record<CrossSportTemplateId, CrossSportTemplate> = {
  "xs.fascial_rotation":   { id:"xs.fascial_rotation",   displayName:"Fascial Rotation",   requiredCategories:["fascial_rotation"],   optionalCategories:["rotational_power"], cnsBudget:0.2, timeBudgetMin:15 },
  "xs.footwork":           { id:"xs.footwork",           displayName:"Footwork Transfer",  requiredCategories:["footwork"],           optionalCategories:["coordination","reflex"], cnsBudget:0.3, timeBudgetMin:15 },
  "xs.explosive_transfer": { id:"xs.explosive_transfer", displayName:"Explosive Transfer", requiredCategories:["explosive_transfer"], optionalCategories:["rotational_power"], cnsBudget:0.5, timeBudgetMin:15 },
  "xs.recovery_transfer":  { id:"xs.recovery_transfer",  displayName:"Recovery Transfer",  requiredCategories:["recovery_transfer"],  optionalCategories:["low_impact"], cnsBudget:0.1, timeBudgetMin:15 },
  "xs.balance_transfer":   { id:"xs.balance_transfer",   displayName:"Balance Transfer",   requiredCategories:["balance_transfer"],   optionalCategories:["coordination"], cnsBudget:0.2, timeBudgetMin:15 },
  "xs.visual_reaction":    { id:"xs.visual_reaction",    displayName:"Visual Reaction",    requiredCategories:["visual_reaction"],    optionalCategories:["reflex"], cnsBudget:0.3, timeBudgetMin:12 },
  "xs.reflex":             { id:"xs.reflex",             displayName:"Reflex Development", requiredCategories:["reflex"],             optionalCategories:["visual_reaction","coordination"], cnsBudget:0.3, timeBudgetMin:12 },
  "xs.coordination":       { id:"xs.coordination",       displayName:"Coordination",       requiredCategories:["coordination"],       optionalCategories:["footwork","balance_transfer"], cnsBudget:0.2, timeBudgetMin:15 },
  "xs.rotational_power":   { id:"xs.rotational_power",   displayName:"Rotational Power",   requiredCategories:["rotational_power"],   optionalCategories:["fascial_rotation","explosive_transfer"], cnsBudget:0.5, timeBudgetMin:15 },
  "xs.low_impact":         { id:"xs.low_impact",         displayName:"Low-Impact Transfer",requiredCategories:["low_impact"],         optionalCategories:["recovery_transfer"], cnsBudget:0.1, timeBudgetMin:15 },
};

export interface CrossSportTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  trainingAge?: string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isRecoveryDay?: boolean;
  availableTimeMin?: number;
}

export function resolveCrossSportTemplate(input: CrossSportTemplateResolutionInput): CrossSportTemplate {
  if (input.isRecoveryDay || input.dayType === "recovery") return CROSS_SPORT_TEMPLATES["xs.recovery_transfer"];
  if (input.isGameDay) return CROSS_SPORT_TEMPLATES["xs.low_impact"];
  const adapt = (input.primaryAdaptation ?? "").toLowerCase();
  if (adapt.includes("rotation")) return CROSS_SPORT_TEMPLATES["xs.rotational_power"];
  if (adapt.includes("explosive") || adapt.includes("power")) return CROSS_SPORT_TEMPLATES["xs.explosive_transfer"];
  if (adapt.includes("react") || adapt.includes("visual")) return CROSS_SPORT_TEMPLATES["xs.visual_reaction"];
  if (adapt.includes("balance")) return CROSS_SPORT_TEMPLATES["xs.balance_transfer"];
  if (adapt.includes("footwork")) return CROSS_SPORT_TEMPLATES["xs.footwork"];
  return CROSS_SPORT_TEMPLATES["xs.coordination"];
}
