// Phase 10 — Canonical Conditioning Templates

import type { ConditioningCategory } from "./movementCategories.ts";

export type ConditioningTemplateId =
  | "cond.aerobic_base"
  | "cond.repeated_sprint"
  | "cond.baseball_game_day"
  | "cond.pitcher_conditioning"
  | "cond.recovery_flush"
  | "cond.tournament_day"
  | "cond.practice_day"
  | "cond.off_day"
  | "cond.return_to_conditioning";

export interface ConditioningTemplate {
  id: ConditioningTemplateId;
  displayName: string;
  requiredCategories: readonly ConditioningCategory[];
  optionalCategories: readonly ConditioningCategory[];
  cnsBudget: number;
  metabolicBudget: number;
  tissueBudget: number;
  intervalProfile: string;
}

export const CONDITIONING_TEMPLATES: Record<ConditioningTemplateId, ConditioningTemplate> = {
  "cond.aerobic_base":        { id:"cond.aerobic_base",        displayName:"Aerobic Base",              requiredCategories:["aerobic_base"], optionalCategories:["tissue_prep"], cnsBudget:0.2, metabolicBudget:0.6, tissueBudget:0.3, intervalProfile:"steady_state_20-40min" },
  "cond.repeated_sprint":     { id:"cond.repeated_sprint",     displayName:"Repeated Sprint",           requiredCategories:["repeated_sprint"], optionalCategories:["alactic_power"], cnsBudget:0.7, metabolicBudget:0.8, tissueBudget:0.5, intervalProfile:"10x30m_r90s" },
  "cond.baseball_game_day":   { id:"cond.baseball_game_day",   displayName:"Baseball Game-Day Primer",  requiredCategories:["tissue_prep"], optionalCategories:["alactic_power"], cnsBudget:0.15, metabolicBudget:0.15, tissueBudget:0.3, intervalProfile:"primer_only" },
  "cond.pitcher_conditioning":{ id:"cond.pitcher_conditioning",displayName:"Pitcher Conditioning",      requiredCategories:["pitcher_specific"], optionalCategories:["aerobic_base","recovery_flush"], cnsBudget:0.35, metabolicBudget:0.55, tissueBudget:0.4, intervalProfile:"foulpole_or_tempo" },
  "cond.recovery_flush":      { id:"cond.recovery_flush",      displayName:"Recovery Flush",            requiredCategories:["recovery_flush"], optionalCategories:["tissue_prep"], cnsBudget:0.05, metabolicBudget:0.2, tissueBudget:0.2, intervalProfile:"easy_flush_10-20min" },
  "cond.tournament_day":      { id:"cond.tournament_day",      displayName:"Tournament Day",            requiredCategories:["tissue_prep"], optionalCategories:["recovery_flush"], cnsBudget:0.1, metabolicBudget:0.1, tissueBudget:0.3, intervalProfile:"primer_only" },
  "cond.practice_day":        { id:"cond.practice_day",        displayName:"Practice-Day Conditioning", requiredCategories:["aerobic_base"], optionalCategories:["repeated_sprint","tissue_prep"], cnsBudget:0.3, metabolicBudget:0.5, tissueBudget:0.35, intervalProfile:"mixed_short" },
  "cond.off_day":             { id:"cond.off_day",             displayName:"Off-Day Conditioning",      requiredCategories:["aerobic_base"], optionalCategories:["tissue_prep","recovery_flush"], cnsBudget:0.25, metabolicBudget:0.55, tissueBudget:0.4, intervalProfile:"tempo_or_zone2" },
  "cond.return_to_conditioning":{ id:"cond.return_to_conditioning", displayName:"Return-to-Conditioning", requiredCategories:["tissue_prep"], optionalCategories:["aerobic_base"], cnsBudget:0.15, metabolicBudget:0.3, tissueBudget:0.3, intervalProfile:"progressive_return" },
};

export interface ConditioningTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  trainingAge?: string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isPracticeDay?: boolean;
  isTournamentDay?: boolean;
  isRecoveryDay?: boolean;
  isReturnToPlay?: boolean;
  isPitcher?: boolean;
}

export function resolveConditioningTemplate(input: ConditioningTemplateResolutionInput): ConditioningTemplate {
  if (input.isReturnToPlay) return CONDITIONING_TEMPLATES["cond.return_to_conditioning"];
  if (input.isTournamentDay) return CONDITIONING_TEMPLATES["cond.tournament_day"];
  if (input.isGameDay) return CONDITIONING_TEMPLATES["cond.baseball_game_day"];
  if (input.isRecoveryDay || input.dayType === "recovery") return CONDITIONING_TEMPLATES["cond.recovery_flush"];
  if (input.isPitcher) return CONDITIONING_TEMPLATES["cond.pitcher_conditioning"];
  if (input.isPracticeDay || input.dayType === "practice") return CONDITIONING_TEMPLATES["cond.practice_day"];
  const adapt = (input.primaryAdaptation ?? "").toLowerCase();
  if (adapt.includes("sprint") || adapt.includes("repeat")) return CONDITIONING_TEMPLATES["cond.repeated_sprint"];
  if ((input.seasonPhase ?? "").toLowerCase().startsWith("off")) return CONDITIONING_TEMPLATES["cond.aerobic_base"];
  return CONDITIONING_TEMPLATES["cond.off_day"];
}
