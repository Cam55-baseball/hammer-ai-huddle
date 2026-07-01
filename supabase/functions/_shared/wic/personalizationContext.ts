// supabase/functions/_shared/wic/personalizationContext.ts — Phase 6 SERVER.
// Shape parity with src/lib/wic/personalizationContext.ts.

import type { AthleteContext } from "./athleteContext.ts";
import type { TrainingAgeContext } from "./trainingAge.ts";

export const PERSONALIZATION_VERSION = "wic_pers_v1";

export type PersonalizationLayer =
  | "safety" | "season" | "schedule" | "readiness" | "injury"
  | "training_age" | "goals" | "position" | "equipment" | "preferences" | "variation";

export const PRIORITY_STACK: PersonalizationLayer[] = [
  "safety", "season", "schedule", "readiness", "injury", "training_age",
  "goals", "position", "equipment", "preferences", "variation",
];

export type VariableStatus = "collected" | "stored" | "consumed" | "unused" | "unknown";

export interface VariableEntry { source: string; status: VariableStatus; layer: PersonalizationLayer; }

export interface SubstitutionSlot {
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

const EMPTY_SLOT: SubstitutionSlot = Object.freeze({ candidates: Object.freeze([]) as unknown as string[], strategy: "none" });

/**
 * resolvePersonalizationContext — declarative, deterministic. Snapshots the
 * variable registry so every future engine can prove which fields are actually
 * consumed vs merely collected.
 */
export function resolvePersonalizationContext(input: {
  athleteContext: AthleteContext;
  trainingAgeContext: TrainingAgeContext;
}): PersonalizationContext {
  const { athleteContext: ac } = input;

  const status = (present: boolean): VariableStatus =>
    present ? "consumed" : "unknown";

  const registry: Record<string, VariableEntry> = {
    // Safety / Injury
    "injury.active_restrictions":    { source: "user_injury_progress", status: status(ac.injury.active_restrictions.length > 0), layer: "injury" },
    "injury.modified_movements":     { source: "user_injury_progress", status: status(ac.injury.modified_movements.length > 0), layer: "injury" },
    // Schedule
    "schedule.game_today":           { source: "gp_games",             status: "consumed", layer: "schedule" },
    "schedule.practice_today":       { source: "scheduled_practice_sessions", status: "consumed", layer: "schedule" },
    "schedule.tournament":           { source: "gp_games",             status: "consumed", layer: "schedule" },
    // Readiness
    "readiness.cns_readiness":       { source: "athlete_daily_log",    status: status(ac.readiness.cns_readiness != null), layer: "readiness" },
    "readiness.sleep_hours":         { source: "athlete_daily_log",    status: status(ac.readiness.sleep_hours != null), layer: "readiness" },
    "readiness.soreness":            { source: "athlete_daily_log",    status: status(ac.readiness.soreness != null), layer: "readiness" },
    // Training age
    "training_age.classification":   { source: "profiles",             status: "consumed", layer: "training_age" },
    "training_age.years":            { source: "profiles",             status: "consumed", layer: "training_age" },
    // Goals
    "goals.list":                    { source: "athlete_body_goals",   status: status(ac.goals.length > 0), layer: "goals" },
    // Position
    "position.primary":              { source: "profiles",             status: status(!!ac.identity.primary_position), layer: "position" },
    "position.secondary":            { source: "profiles",             status: status(!!ac.identity.secondary_position), layer: "position" },
    "position.two_way":              { source: "profiles",             status: status(ac.identity.two_way), layer: "position" },
    // Equipment
    "equipment.available":           { source: "athlete_equipment_context", status: status(ac.environment.equipment.length > 0), layer: "equipment" },
    "environment.indoor_outdoor":    { source: "athlete_equipment_context", status: status(!!ac.environment.indoor_outdoor), layer: "equipment" },
    // Preferences
    "preferences.available_time":    { source: "training_preferences", status: status(ac.environment.available_time_min != null), layer: "preferences" },
    // Season resolved by TrainingContext (Phase 4) — declared here so the
    // registry surfaces it as a first-class personalization input.
    "season.phase":                  { source: "training_context",     status: "consumed", layer: "season" },
  };

  return Object.freeze({
    personalization_version: PERSONALIZATION_VERSION,
    priority_stack: Object.freeze([...PRIORITY_STACK]) as unknown as PersonalizationLayer[],
    variable_registry: Object.freeze(registry),
    substitution_framework: Object.freeze({
      equipment: EMPTY_SLOT, environment: EMPTY_SLOT,
      injury: EMPTY_SLOT, time: EMPTY_SLOT, coach_override: EMPTY_SLOT,
    }) as SubstitutionFramework,
  }) as PersonalizationContext;
}
