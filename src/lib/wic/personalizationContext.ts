// src/lib/wic/personalizationContext.ts — Phase 6.
//
// CONSTITUTIONAL AUTHORITY FOR PERSONALIZATION.
//
// The deterministic priority stack every future engine consumes. Also declares
// the substitution framework STRUCTURE (populated by later phases) and the
// variable registry that eliminates hidden personalization.
//
// Shape parity with: supabase/functions/_shared/wic/personalizationContext.ts

export const PERSONALIZATION_VERSION = "wic_pers_v1";

export type PersonalizationLayer =
  | "safety"
  | "season"
  | "schedule"
  | "readiness"
  | "injury"
  | "training_age"
  | "goals"
  | "position"
  | "equipment"
  | "preferences"
  | "variation";

export const PRIORITY_STACK: PersonalizationLayer[] = [
  "safety",
  "season",
  "schedule",
  "readiness",
  "injury",
  "training_age",
  "goals",
  "position",
  "equipment",
  "preferences",
  "variation",
];

export type VariableStatus = "collected" | "stored" | "consumed" | "unused" | "unknown";

export interface VariableEntry {
  source: string;
  status: VariableStatus;
  layer: PersonalizationLayer;
}

export interface SubstitutionSlot {
  /** Structural placeholder — populated by later phases. */
  candidates: string[];
  strategy: "none" | "equipment" | "environment" | "injury" | "time" | "coach_override";
}

export interface SubstitutionFramework {
  equipment: SubstitutionSlot;
  environment: SubstitutionSlot;
  injury: SubstitutionSlot;
  time: SubstitutionSlot;
  coach_override: SubstitutionSlot;
}

export interface PersonalizationContext {
  readonly personalization_version: string;
  readonly priority_stack: PersonalizationLayer[];
  readonly variable_registry: Record<string, VariableEntry>;
  readonly substitution_framework: SubstitutionFramework;
}

export const EMPTY_SUBSTITUTION_FRAMEWORK: SubstitutionFramework = Object.freeze({
  equipment:       Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" }),
  environment:     Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" }),
  injury:          Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" }),
  time:            Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" }),
  coach_override:  Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" }),
}) as SubstitutionFramework;
