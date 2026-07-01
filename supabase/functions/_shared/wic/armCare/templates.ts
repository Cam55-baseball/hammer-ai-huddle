// Phase 10 — Canonical Arm Care Templates

import type { ArmCareCategory } from "./movementCategories.ts";

export type ArmCareTemplateId =
  | "ac.throwing_day"
  | "ac.non_throwing_day"
  | "ac.bullpen"
  | "ac.starter"
  | "ac.reliever"
  | "ac.position_player"
  | "ac.two_way"
  | "ac.recovery"
  | "ac.return_to_throwing";

export interface ArmCareTemplate {
  id: ArmCareTemplateId;
  displayName: string;
  requiredCategories: readonly ArmCareCategory[];
  optionalCategories: readonly ArmCareCategory[];
  cnsBudget: number;
  tissueBudget: number;
  throwingPhaseTag: string;
}

export const ARM_CARE_TEMPLATES: Record<ArmCareTemplateId, ArmCareTemplate> = {
  "ac.throwing_day":       { id:"ac.throwing_day",       displayName:"Throwing Day Arm Care",       requiredCategories:["throwing_day"],       optionalCategories:[], cnsBudget:0.15, tissueBudget:0.25, throwingPhaseTag:"throwing_day" },
  "ac.non_throwing_day":   { id:"ac.non_throwing_day",   displayName:"Non-Throwing Day Arm Care",   requiredCategories:["non_throwing_day"],   optionalCategories:["recovery"], cnsBudget:0.2, tissueBudget:0.35, throwingPhaseTag:"non_throwing_day" },
  "ac.bullpen":            { id:"ac.bullpen",            displayName:"Bullpen Arm Care",            requiredCategories:["bullpen"],            optionalCategories:["throwing_day"], cnsBudget:0.3, tissueBudget:0.35, throwingPhaseTag:"bullpen" },
  "ac.starter":            { id:"ac.starter",            displayName:"Starter Arm Care",            requiredCategories:["starter"],            optionalCategories:["throwing_day","recovery"], cnsBudget:0.25, tissueBudget:0.35, throwingPhaseTag:"throwing_day" },
  "ac.reliever":           { id:"ac.reliever",           displayName:"Reliever Arm Care",           requiredCategories:["reliever"],           optionalCategories:["throwing_day","recovery"], cnsBudget:0.2, tissueBudget:0.3, throwingPhaseTag:"throwing_day" },
  "ac.position_player":    { id:"ac.position_player",    displayName:"Position Player Arm Care",    requiredCategories:["position_player"],    optionalCategories:["non_throwing_day"], cnsBudget:0.15, tissueBudget:0.25, throwingPhaseTag:"throwing_day" },
  "ac.two_way":            { id:"ac.two_way",            displayName:"Two-Way Arm Care",            requiredCategories:["two_way"],            optionalCategories:["throwing_day","non_throwing_day"], cnsBudget:0.3, tissueBudget:0.4, throwingPhaseTag:"throwing_day" },
  "ac.recovery":           { id:"ac.recovery",           displayName:"Arm Care Recovery",           requiredCategories:["recovery"],           optionalCategories:["non_throwing_day"], cnsBudget:0.1, tissueBudget:0.3, throwingPhaseTag:"recovery" },
  "ac.return_to_throwing": { id:"ac.return_to_throwing", displayName:"Return to Throwing",          requiredCategories:["return_to_throwing"], optionalCategories:["recovery"], cnsBudget:0.2, tissueBudget:0.3, throwingPhaseTag:"rtp" },
};

export interface ArmCareTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  trainingAge?: string;
  primaryAdaptation?: string;
  position?: string;
  isPitcher?: boolean;
  isTwoWay?: boolean;
  isStarter?: boolean;
  isReliever?: boolean;
  isThrowingDay?: boolean;
  isBullpenDay?: boolean;
  isRecoveryDay?: boolean;
  isReturnToPlay?: boolean;
  workloadUnitsLast72h?: number;
  hasInjuryRestriction?: boolean;
}

export function resolveArmCareTemplate(input: ArmCareTemplateResolutionInput): ArmCareTemplate {
  if (input.isReturnToPlay || input.hasInjuryRestriction) return ARM_CARE_TEMPLATES["ac.return_to_throwing"];
  if (input.isRecoveryDay || input.dayType === "recovery") return ARM_CARE_TEMPLATES["ac.recovery"];
  if (input.isBullpenDay) return ARM_CARE_TEMPLATES["ac.bullpen"];
  if (input.isTwoWay) return ARM_CARE_TEMPLATES["ac.two_way"];
  if (input.isPitcher && input.isStarter) return ARM_CARE_TEMPLATES["ac.starter"];
  if (input.isPitcher && input.isReliever) return ARM_CARE_TEMPLATES["ac.reliever"];
  if (!input.isPitcher) return ARM_CARE_TEMPLATES["ac.position_player"];
  if (input.isThrowingDay) return ARM_CARE_TEMPLATES["ac.throwing_day"];
  return ARM_CARE_TEMPLATES["ac.non_throwing_day"];
}
