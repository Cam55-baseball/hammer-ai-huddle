/**
 * Athlete Context Envelope — typed reader for the canonical
 * `public.get_athlete_context_envelope(p_user)` RPC.
 *
 * Sprint: Athlete Context Spine Implementation (P0-1).
 *
 * Every spine variable is returned with the full lineage envelope:
 * `{ value, source, confidence, missing, last_updated, owner }`.
 * Consumers must use this — direct reads against `profiles.*` or
 * raw `athlete_context.*` are constitutionally illegal once this
 * sprint is ratified.
 */
import { supabase } from "@/integrations/supabase/client";

export type EnvelopeConfidence =
  | "high"
  | "medium"
  | "low"
  | "missing"
  | "self_report"
  | "corroborated"
  | "derived";

export interface EnvelopeEntry<T = unknown> {
  value: T | null;
  source: string;
  confidence: EnvelopeConfidence;
  missing: boolean;
  last_updated: string | null;
  owner: "athlete" | "derived" | "parent" | "clinician" | "system";
  // equipment_effective extends with scope+venue; tolerate extra fields:
  [k: string]: unknown;
}

export type AthleteContextEnvelope = Record<string, EnvelopeEntry>;

export const SPINE_VARIABLE_KEYS = [
  "sport_primary",
  "goal_summary",
  "goal_horizon",
  "weekly_availability_days",
  "weekly_availability_hours",
  "typical_session_length_min",
  "training_focus",
  "development_priorities",
  "lifting_age_years",
  "years_in_sport",
  "school_grade",
  "season_phase",
  "injury_history",
  "equipment_effective",
  "lifecycle_band",
  "safeguarding_minor",
  // Onboarding Overhaul additions
  "other_sports",
  "competition_level",
  "education_stage",
  "lifting_history",
  "position_primary",
  "position_secondary",
  "throws_hand",
  "bats_hand",
  "anthropometrics",
] as const;

export type SpineVariableKey = (typeof SPINE_VARIABLE_KEYS)[number];

export async function fetchAthleteContextEnvelope(
  userId: string,
): Promise<AthleteContextEnvelope> {
  // RPC not in generated types yet — cast through unknown.
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    "get_athlete_context_envelope",
    { p_user: userId },
  );
  if (error) throw new Error(error.message);
  return (data ?? {}) as AthleteContextEnvelope;
}
