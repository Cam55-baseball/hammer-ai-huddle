/**
 * Athlete Context Acquisition — Minimum Context Set and persistence helpers.
 *
 * Sprint: Athlete Context Spine Implementation (P0-1).
 *
 * Implements:
 *   - MINIMUM_CONTEXT_SET — the P0 keys per Section H of the constitution.
 *   - persistContextAnswer — writes onto `athlete_context` with confidence + lineage.
 *   - persistCoachContextAnswer / persistScoutContextAnswer — role-specific stores.
 *   - acquisition trigger sources for development-history events.
 *
 * Pure interpretive layer; never authors organism truth. Missingness is
 * preserved, never imputed.
 */
import { supabase } from "@/integrations/supabase/client";

export const MINIMUM_CONTEXT_SET = [
  "sport_primary",
  "goal_summary",
  "weekly_availability_days",
  "weekly_availability_hours",
  "training_focus",
  "development_priorities",
  "lifting_age_years",
  "school_grade",
  "season_phase",
  "injury_history",
] as const;

export type MinimumContextKey = (typeof MINIMUM_CONTEXT_SET)[number];

// Map a spine key to an `athlete_context` column.
const COLUMN_BY_KEY: Record<string, string> = {
  sport_primary: "sport_primary",
  goal_summary: "goal_summary",
  goal_horizon: "goal_horizon",
  weekly_availability_days: "weekly_availability_days",
  weekly_availability_hours: "weekly_availability_hours",
  typical_session_length_min: "typical_session_length_min",
  training_focus: "training_focus",
  development_priorities: "development_priorities",
  lifting_age_years: "lifting_age_years",
  years_in_sport: "years_in_sport",
  school_grade: "school_grade",
  season_phase: "season_phase",
  injury_history: "injury_history",
  // New onboarding fields (Phase: Onboarding Overhaul)
  other_sports: "other_sports",
  competition_level: "competition_level",
  education_stage: "education_stage",
  lifting_history: "lifting_history",
  position_primary: "position_primary",
  position_secondary: "position_secondary",
  throws_hand: "throws_hand",
  bats_hand: "bats_hand",
  anthropometrics: "anthropometrics",
};

type AnyValue = string | number | string[] | unknown;

/**
 * Persist a single athlete-context answer with confidence + lineage envelope.
 * Upserts onto `athlete_context` (one row per user).
 */
export async function persistContextAnswer(
  userId: string,
  key: string,
  value: AnyValue,
  source: string,
  confidence: "self_report" | "corroborated" | "high" | "medium" | "low" = "self_report",
): Promise<void> {
  const column = COLUMN_BY_KEY[key];
  if (!column) throw new Error(`Unknown context key: ${key}`);

  const { data: existing } = await (supabase.from("athlete_context") as unknown as {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { confidence: Record<string, string> | null } | null }>;
      };
    };
  })
    .select("confidence")
    .eq("user_id", userId)
    .maybeSingle();

  const confMap = {
    ...(((existing?.confidence as Record<string, string> | null) ?? {}) as Record<string, string>),
    [key]: confidence,
  };

  const payload: Record<string, unknown> = {
    user_id: userId,
    [column]: value,
    confidence: confMap,
    last_authored_at: new Date().toISOString(),
    last_authored_by: userId,
  };

  const { error } = await (supabase.from("athlete_context") as unknown as {
    upsert: (v: unknown, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`persistContextAnswer(${key}): ${error.message}`);
}

/** Persist a coach-onboarding answer onto `coach_context`. */
export async function persistCoachContextAnswer(
  userId: string,
  key: string,
  value: AnyValue,
): Promise<void> {
  const payload: Record<string, unknown> = { user_id: userId, [key]: value };
  const { error } = await (supabase.from("coach_context") as unknown as {
    upsert: (v: unknown, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`persistCoachContextAnswer(${key}): ${error.message}`);
}

/** Persist a scout-onboarding answer onto `scout_context`. */
export async function persistScoutContextAnswer(
  userId: string,
  key: string,
  value: AnyValue,
): Promise<void> {
  const payload: Record<string, unknown> = { user_id: userId, [key]: value };
  const { error } = await (supabase.from("scout_context") as unknown as {
    upsert: (v: unknown, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`persistScoutContextAnswer(${key}): ${error.message}`);
}

/** Append a development-history event (lifting/training age, detraining, injury, etc.). */
export async function appendDevelopmentHistoryEvent(
  userId: string,
  eventType:
    | "lifting_age_attestation"
    | "training_age_attestation"
    | "detraining_period"
    | "injury_interruption"
    | "sport_transition"
    | "coaching_change"
    | "growth_spurt"
    | "developmental_milestone",
  eventDate: string,
  payload: Record<string, unknown>,
  source: string,
  confidence: string = "self_report",
): Promise<void> {
  const { error } = await (supabase.from("athlete_development_history_events") as unknown as {
    insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
  }).insert({
    user_id: userId,
    event_type: eventType,
    event_date: eventDate,
    payload,
    source,
    confidence,
  });
  if (error) throw new Error(`appendDevelopmentHistoryEvent: ${error.message}`);
}
