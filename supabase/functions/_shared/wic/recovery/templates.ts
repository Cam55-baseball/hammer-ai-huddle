// Phase 10 — Canonical Recovery Templates

import type { RecoveryCategory } from "./movementCategories.ts";

export type RecoveryTemplateId =
  | "rec.cns"
  | "rec.tissue"
  | "rec.mobility"
  | "rec.regeneration"
  | "rec.deload"
  | "rec.post_game"
  | "rec.travel"
  | "rec.sleep";

export interface RecoveryTemplate {
  id: RecoveryTemplateId;
  displayName: string;
  requiredCategories: readonly RecoveryCategory[];
  optionalCategories: readonly RecoveryCategory[];
  cnsBudget: number;
  tissueBudget: number;
}

export const RECOVERY_TEMPLATES: Record<RecoveryTemplateId, RecoveryTemplate> = {
  "rec.cns":          { id:"rec.cns",          displayName:"CNS Recovery",          requiredCategories:["cns"],          optionalCategories:["mobility","sleep"], cnsBudget:0.1, tissueBudget:0.2 },
  "rec.tissue":       { id:"rec.tissue",       displayName:"Tissue Recovery",       requiredCategories:["tissue"],       optionalCategories:["mobility"], cnsBudget:0.1, tissueBudget:0.4 },
  "rec.mobility":     { id:"rec.mobility",     displayName:"Mobility",              requiredCategories:["mobility"],     optionalCategories:["tissue"], cnsBudget:0.15, tissueBudget:0.3 },
  "rec.regeneration": { id:"rec.regeneration", displayName:"Regeneration",          requiredCategories:["regeneration"], optionalCategories:["mobility","sleep"], cnsBudget:0.1, tissueBudget:0.3 },
  "rec.deload":       { id:"rec.deload",       displayName:"Deload",                requiredCategories:["deload"],       optionalCategories:["mobility","regeneration"], cnsBudget:0.2, tissueBudget:0.3 },
  "rec.post_game":    { id:"rec.post_game",    displayName:"Post-Game Recovery",    requiredCategories:["post_game"],    optionalCategories:["tissue","mobility"], cnsBudget:0.1, tissueBudget:0.35 },
  "rec.travel":       { id:"rec.travel",       displayName:"Travel Recovery",       requiredCategories:["travel"],       optionalCategories:["mobility","tissue"], cnsBudget:0.1, tissueBudget:0.25 },
  "rec.sleep":        { id:"rec.sleep",        displayName:"Sleep Optimization",    requiredCategories:["sleep"],        optionalCategories:["regeneration"], cnsBudget:0.05, tissueBudget:0.1 },
};

export interface RecoveryTemplateResolutionInput {
  seasonPhase: string;
  dayType?: string;
  primaryAdaptation?: string;
  isGameDay?: boolean;
  isPostGame?: boolean;
  isTravelDay?: boolean;
  isDeloadWeek?: boolean;
  isRecoveryDay?: boolean;
  cnsFatigue?: number;
  tissueFatigue?: number;
}

export function resolveRecoveryTemplate(input: RecoveryTemplateResolutionInput): RecoveryTemplate {
  if (input.isPostGame) return RECOVERY_TEMPLATES["rec.post_game"];
  if (input.isTravelDay) return RECOVERY_TEMPLATES["rec.travel"];
  if (input.isDeloadWeek) return RECOVERY_TEMPLATES["rec.deload"];
  if ((input.cnsFatigue ?? 0) >= 0.7) return RECOVERY_TEMPLATES["rec.cns"];
  if ((input.tissueFatigue ?? 0) >= 0.7) return RECOVERY_TEMPLATES["rec.tissue"];
  if (input.isRecoveryDay || input.dayType === "recovery") return RECOVERY_TEMPLATES["rec.regeneration"];
  return RECOVERY_TEMPLATES["rec.mobility"];
}
