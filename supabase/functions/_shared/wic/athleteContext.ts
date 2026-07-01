// supabase/functions/_shared/wic/athleteContext.ts — Phase 5 SERVER.
// Shape parity with src/lib/wic/athleteContext.ts. This file OWNS resolution.

import type { TrainingAgeContext } from "./trainingAge.ts";
import { resolveTrainingAge } from "./trainingAge.ts";

export const ATHLETE_CONTEXT_VERSION = "wic_ac_v1";

export type Sport = "baseball" | "softball";
export type Side = "L" | "R" | "S" | null;
export type CompetitiveLevel =
  | "youth" | "middle_school" | "high_school" | "college" | "professional" | "unknown";

export interface IdentityBlock {
  athlete_id: string; sport: Sport; handedness: Side;
  throwing_side: Side; hitting_side: Side;
  primary_position: string | null; secondary_position: string | null; two_way: boolean;
}
export interface DevelopmentBlock {
  chronological_age: number | null; training_age_years: number;
  training_age: TrainingAgeContext["classification"] | null;
  biological_stage: string | null; competitive_level: CompetitiveLevel;
  organizational_level: string | null;
}
export interface AnthropometricsBlock {
  height_in: number | null; weight_lb: number | null; body_composition: number | null;
  limb_proportions: Record<string, number> | null; dominant_side: Side;
}
export interface EnvironmentBlock {
  equipment: string[]; facility: string | null;
  indoor_outdoor: "indoor" | "outdoor" | "mixed" | null;
  available_time_min: number | null; weather_dependency: boolean; substitution_capability: boolean;
}
export interface ScheduleBlock {
  game_today: boolean; practice_today: boolean; tournament: boolean; travel: boolean;
  bullpen: boolean; throwing_day: boolean; off_day: boolean; recovery_day: boolean;
}
export interface GoalEntry {
  key: string;
  category: "speed" | "power" | "throwing" | "hitting" | "fielding" | "body" | "other";
  rank: number | null; label: string;
}
export interface ReadinessBlock {
  cns_readiness: number | null; soreness: number | null; fatigue: number | null;
  sleep_hours: number | null; workload_7d: number | null; compliance_7d: number | null;
}
export interface InjuryBlock {
  active_restrictions: string[]; modified_movements: string[]; return_to_play: string | null;
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

function toSide(v: unknown): Side {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (s === "L" || s === "LEFT") return "L";
  if (s === "R" || s === "RIGHT") return "R";
  if (s === "S" || s === "SWITCH") return "S";
  return null;
}

function competitiveLevelFrom(profile: any): CompetitiveLevel {
  const raw = String(profile?.competitive_level ?? profile?.level ?? profile?.age_group ?? "").toLowerCase();
  if (raw.includes("pro")) return "professional";
  if (raw.includes("college") || raw.includes("ncaa")) return "college";
  if (raw.includes("high") || raw.includes("hs")) return "high_school";
  if (raw.includes("middle") || raw.includes("ms")) return "middle_school";
  if (raw.includes("youth") || raw.includes("little") || raw.includes("travel")) return "youth";
  return "unknown";
}

/**
 * resolveAthleteContext — deterministic, side-effect-free.
 *
 * Consumes: profiles, athlete_context, user_injury_progress, athlete_daily_log,
 * athlete_equipment_context, training_preferences, weight_entries,
 * athlete_body_goals, athlete_side_preferences.
 *
 * Every input is a plain row (already fetched by the caller) — this function
 * never issues its own queries. That keeps generation deterministic and
 * testable, and matches the Phase 4 resolver pattern.
 */
export function resolveAthleteContext(input: {
  userId: string;
  profile: any | null;
  athleteContext: any | null;
  sidePreference: any | null;
  equipmentContext: any | null;
  trainingPreferences: any | null;
  latestWeight: any | null;
  bodyGoals: any[] | null;
  dailyLog: any | null;
  injuries: any[] | null;
  gamesToday: any[] | null;
  practicesToday: any[] | null;
  trainingAgeCtx: TrainingAgeContext;
}): AthleteContext {
  const p = input.profile ?? {};
  const sport: Sport = (p.sport === "softball" ? "softball" : "baseball");
  const missing: string[] = [];
  const need = (present: boolean, key: string) => { if (!present) missing.push(key); };

  const throwingSide = toSide(input.sidePreference?.throwing_side ?? p.throwing_hand ?? p.throws);
  const hittingSide = toSide(input.sidePreference?.hitting_side ?? p.batting_hand ?? p.bats);
  const handedness = toSide(p.handedness) ?? throwingSide;
  const primary = p.primary_position ?? p.position ?? null;
  const secondary = p.secondary_position ?? null;
  const twoWay = !!(p.two_way ?? p.is_two_way);

  need(!!input.profile, "profile");
  need(!!throwingSide, "throwing_side");
  need(!!hittingSide, "hitting_side");
  need(!!primary, "primary_position");

  const chronoAge = Number(p.age ?? p.age_years ?? p.chronological_age ?? NaN);
  const compLevel = competitiveLevelFrom(p);
  need(Number.isFinite(chronoAge), "chronological_age");
  need(compLevel !== "unknown", "competitive_level");

  const weightLb = Number(input.latestWeight?.weight_lb ?? input.latestWeight?.weight ?? p.weight_lb ?? p.weight ?? NaN);
  const heightIn = Number(p.height_in ?? p.height ?? NaN);
  need(Number.isFinite(weightLb), "weight_lb");
  need(Number.isFinite(heightIn), "height_in");

  const equipmentRaw = input.equipmentContext?.available_equipment ?? input.equipmentContext?.equipment ?? [];
  const equipment = Array.isArray(equipmentRaw) ? equipmentRaw.map(String) : [];
  const facility = input.equipmentContext?.facility ?? null;
  const availableTime = Number(input.trainingPreferences?.available_time_min ?? input.trainingPreferences?.session_length_min ?? NaN);
  need(equipment.length > 0, "equipment");

  const isGameDay = (input.gamesToday ?? []).length > 0;
  const isPracticeDay = (input.practicesToday ?? []).length > 0;
  const schedule: ScheduleBlock = {
    game_today: isGameDay,
    practice_today: isPracticeDay,
    tournament: !!(input.gamesToday ?? []).some((g: any) => String(g?.game_type ?? "").toLowerCase().includes("tournament")),
    travel: !!input.athleteContext?.travel_today,
    bullpen: !!input.athleteContext?.bullpen_today,
    throwing_day: !!input.athleteContext?.throwing_day,
    off_day: !isGameDay && !isPracticeDay && !!input.athleteContext?.off_day,
    recovery_day: !!input.athleteContext?.recovery_day,
  };

  const goals: GoalEntry[] = [];
  const goalRows = input.bodyGoals ?? [];
  for (const g of goalRows) {
    goals.push({
      key: String(g.goal_key ?? g.goal ?? g.id ?? ""),
      category: (String(g.category ?? "other").toLowerCase() as GoalEntry["category"]) ?? "other",
      rank: g.rank ?? g.priority ?? null,
      label: String(g.label ?? g.goal_key ?? g.goal ?? "goal"),
    });
  }
  // Category goals from profile (speed/power/throwing/hitting/fielding).
  for (const cat of ["speed", "power", "throwing", "hitting", "fielding"] as const) {
    const key = `goal_${cat}`;
    const val = p[key];
    if (val) goals.push({ key, category: cat, rank: null, label: String(val) });
  }
  need(goals.length > 0, "goals");

  const dl = input.dailyLog ?? {};
  const readiness: ReadinessBlock = {
    cns_readiness: numOrNull(dl.cns_readiness ?? dl.readiness),
    soreness: numOrNull(dl.soreness),
    fatigue: numOrNull(dl.fatigue),
    sleep_hours: numOrNull(dl.sleep_hours ?? dl.sleep),
    workload_7d: numOrNull(input.athleteContext?.workload_7d),
    compliance_7d: numOrNull(input.athleteContext?.compliance_7d),
  };
  need(readiness.cns_readiness != null || readiness.sleep_hours != null, "readiness");

  const injuryRows = input.injuries ?? [];
  const injury: InjuryBlock = {
    active_restrictions: injuryRows.map((r: any) => String(r.injury_slug ?? r.slug ?? "")).filter(Boolean),
    modified_movements: injuryRows.flatMap((r: any) => Array.isArray(r.modified_movements) ? r.modified_movements.map(String) : []),
    return_to_play: input.athleteContext?.return_to_play ?? null,
  };

  const trackedFields = 12;
  const completeness = Math.max(0, Math.min(1, 1 - missing.length / trackedFields));

  return Object.freeze({
    athlete_context_version: ATHLETE_CONTEXT_VERSION,
    identity: Object.freeze({
      athlete_id: input.userId,
      sport, handedness, throwing_side: throwingSide, hitting_side: hittingSide,
      primary_position: primary, secondary_position: secondary, two_way: twoWay,
    }),
    development: Object.freeze({
      chronological_age: Number.isFinite(chronoAge) ? chronoAge : null,
      training_age_years: input.trainingAgeCtx.training_age_years,
      training_age: input.trainingAgeCtx.classification,
      biological_stage: p.biological_stage ?? null,
      competitive_level: compLevel,
      organizational_level: p.organization ?? p.school ?? p.team_name ?? null,
    }),
    anthropometrics: Object.freeze({
      height_in: Number.isFinite(heightIn) ? heightIn : null,
      weight_lb: Number.isFinite(weightLb) ? weightLb : null,
      body_composition: numOrNull(p.body_fat_pct ?? p.body_composition),
      limb_proportions: (p.limb_proportions && typeof p.limb_proportions === "object") ? p.limb_proportions : null,
      dominant_side: handedness,
    }),
    environment: Object.freeze({
      equipment,
      facility,
      indoor_outdoor: (input.equipmentContext?.indoor_outdoor as any) ?? null,
      available_time_min: Number.isFinite(availableTime) ? availableTime : null,
      weather_dependency: !!input.equipmentContext?.weather_dependency,
      substitution_capability: !!input.equipmentContext?.substitution_capability,
    }),
    schedule: Object.freeze(schedule),
    goals: Object.freeze(goals) as unknown as GoalEntry[],
    readiness: Object.freeze(readiness),
    injury: Object.freeze({
      active_restrictions: Object.freeze(injury.active_restrictions) as unknown as string[],
      modified_movements: Object.freeze(injury.modified_movements) as unknown as string[],
      return_to_play: injury.return_to_play,
    }),
    completeness_score: Number(completeness.toFixed(3)),
    missing_fields: Object.freeze(missing) as unknown as string[],
  }) as AthleteContext;
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
