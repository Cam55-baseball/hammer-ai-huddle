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
  competition_age_group: "competition_age_group",
  competition_home_state: "competition_home_state",
  competition_play_state: "competition_play_state",
  competition_events: "competition_events",
  // Extended onboarding (Fuel & recovery / Mental & career / Connections)
  sleep_target_hrs: "sleep_target_hrs",
  water_goal_oz: "water_goal_oz",
  diet_style: "diet_style",
  allergies: "allergies",
  level_target: "level_target",
  focus_area: "focus_area",
  pregame_routine: "pregame_routine",
  coach_code: "coach_code",
};

/**
 * Session guard — ensures the Supabase JWT is fresh and matches `userId`
 * before any write. Prevents "new row violates row-level security policy"
 * errors that occur when React still holds a stale `user` object but the
 * PostgREST request goes out under an expired / evicted token.
 */
async function ensureFreshSession(userId: string): Promise<void> {
  const { data: sessData } = await supabase.auth.getSession();
  let session = sessData.session;
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = session?.expires_at ?? 0;
  const needsRefresh = !session || !session.access_token || expiresAt - nowSec < 60;
  if (needsRefresh) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      throw new Error("Session expired — please sign in again");
    }
    session = refreshed.session;
  }
  if (session.user.id !== userId) {
    throw new Error("Session expired — please sign in again");
  }
}

type AnyValue = string | number | string[] | unknown;

/**
 * Canonical-shape coercion for `injury_history`.
 *
 * Centralised so every persistence path emits the same JSONB structure:
 * `Array<{ note: string, reported_at?: string, region?, severity?, recovery_status? }>`
 *
 * Accepted inputs:
 *   - string (legacy free-text) → `[{ note, reported_at }]` ("none" → [])
 *   - string[]                  → list of `{ note }`
 *   - structured object `{ status, regions, severity, note }`
 *       - `status: "healthy"` → []  (preserves "100% healthy" intent)
 *       - otherwise spreads region(s) into separate notes
 *   - already-canonical array of notes → passed through with reported_at fill
 */
export function canonicalizeInjuryHistory(value: unknown): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v == null) return null;
        if (typeof v === "string") {
          const s = v.trim();
          return s === "" ? null : { note: s, reported_at: now };
        }
        if (typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (!o.reported_at) return { ...o, reported_at: now };
          return o;
        }
        return null;
      })
      .filter((x): x is Record<string, unknown> => x !== null);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.status === "string" && o.status === "healthy") return [];
    const regions = Array.isArray(o.regions) ? (o.regions as string[]) : [];
    if (regions.length === 0 && typeof o.note === "string" && o.note.trim() !== "") {
      return [{ note: o.note, severity: o.severity, reported_at: now }];
    }
    return regions.map((r) => ({
      note: typeof o.note === "string" && o.note.trim() !== "" ? o.note : r,
      region: r,
      severity: typeof o.severity === "string" ? o.severity : undefined,
      reported_at: now,
    }));
  }
  const s = String(value ?? "").trim();
  if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "no") return [];
  return [{ note: s, reported_at: now }];
}



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
