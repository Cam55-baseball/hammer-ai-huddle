// src/lib/wic/athleteContext.ts — Phase 5.
//
// CONSTITUTIONAL AUTHORITY FOR ATHLETE CONTEXT.
//
// Every workout engine MUST consume the same immutable `AthleteContext`
// object. No engine may independently collect athlete variables. This module
// defines the shape only — the resolver lives on the server mirror.
//
// Wire existing data only — no invented calculations.
//
// Shape parity with: supabase/functions/_shared/wic/athleteContext.ts

import type { TrainingAgeContext } from "./trainingAge";

export const ATHLETE_CONTEXT_VERSION = "wic_ac_v1";

export type Sport = "baseball" | "softball";
export type Side = "L" | "R" | "S" | null;
export type CompetitiveLevel =
  | "youth"
  | "middle_school"
  | "high_school"
  | "college"
  | "professional"
  | "unknown";

export interface IdentityBlock {
  athlete_id: string;
  sport: Sport;
  handedness: Side;
  throwing_side: Side;
  hitting_side: Side;
  primary_position: string | null;
  secondary_position: string | null;
  two_way: boolean;
}

export interface DevelopmentBlock {
  chronological_age: number | null;
  training_age_years: number;
  training_age: TrainingAgeContext["classification"] | null;
  biological_stage: string | null;
  competitive_level: CompetitiveLevel;
  organizational_level: string | null;
}

export interface AnthropometricsBlock {
  height_in: number | null;
  weight_lb: number | null;
  body_composition: number | null;
  limb_proportions: Record<string, number> | null;
  dominant_side: Side;
}

export interface EnvironmentBlock {
  equipment: string[];
  facility: string | null;
  indoor_outdoor: "indoor" | "outdoor" | "mixed" | null;
  available_time_min: number | null;
  weather_dependency: boolean;
  substitution_capability: boolean;
}

export interface ScheduleBlock {
  game_today: boolean;
  practice_today: boolean;
  tournament: boolean;
  travel: boolean;
  bullpen: boolean;
  throwing_day: boolean;
  off_day: boolean;
  recovery_day: boolean;
}

export interface GoalEntry {
  key: string;
  category: "speed" | "power" | "throwing" | "hitting" | "fielding" | "body" | "other";
  rank: number | null;
  label: string;
}

export interface ReadinessBlock {
  cns_readiness: number | null;
  soreness: number | null;
  fatigue: number | null;
  sleep_hours: number | null;
  workload_7d: number | null;
  compliance_7d: number | null;
}

export interface InjuryBlock {
  active_restrictions: string[];
  modified_movements: string[];
  return_to_play: string | null;
}

export interface AthleteContext {
  readonly athlete_context_version: string;
  readonly identity: IdentityBlock;
  readonly development: DevelopmentBlock;
  readonly anthropometrics: AnthropometricsBlock;
  readonly environment: EnvironmentBlock;
  readonly schedule: ScheduleBlock;
  readonly goals: GoalEntry[];
  readonly readiness: ReadinessBlock;
  readonly injury: InjuryBlock;
  readonly completeness_score: number;
  readonly missing_fields: string[];
}
