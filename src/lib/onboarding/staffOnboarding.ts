/**
 * staffOnboarding — shared vocabulary + persistence helpers for the
 * scout and coach first-run flows.
 *
 * These flows are deliberately NOT the athlete flow with fields hidden.
 * Scouts and coaches answer about their own work (coverage, program,
 * evaluation focus), and their answers land in the canonical
 * `scout_context` / `coach_context` tables — never in athlete_context.
 *
 * Constitutional: nothing here authors athlete organism truth. Staff
 * context is interpretive metadata about the evaluator/coach only.
 */
import { supabase } from "@/integrations/supabase/client";

/* ---------------------------------- Scout --------------------------------- */

export const SCOUT_SPORTS = ["Baseball", "Softball"] as const;

export const SCOUT_REGIONS = [
  "Northeast",
  "Mid-Atlantic",
  "Southeast",
  "Midwest",
  "Southwest",
  "West",
  "Northwest",
  "National",
  "International",
] as const;

export const SCOUT_LEVELS = [
  "Youth (8U–12U)",
  "Middle school (13U–14U)",
  "High school (15U–18U)",
  "Junior college",
  "4-year college",
  "Professional",
] as const;

export const SCOUT_EVALUATION_FOCUS = [
  "Hitting",
  "Power",
  "Pitching",
  "Catching",
  "Infield defense",
  "Outfield defense",
  "Run times / athleticism",
  "Makeup & mental",
] as const;

export interface ScoutContextDraft {
  org_name?: string | null;
  athlete_pool_size?: number | null;
  sports?: string[];
  regions?: string[];
  level_focus?: string[];
  evaluation_focus?: string[];
}

/**
 * Persist scout setup. `complete` stamps the explicit completion flag —
 * once set, first-run setup never auto-prompts again (they can still reopen
 * it from Settings). Partial saves (complete: false) keep progress without
 * ending the flow.
 */
export async function saveScoutContext(
  userId: string,
  draft: ScoutContextDraft,
  opts: { complete?: boolean } = {},
) {
  const { error } = await supabase.from("scout_context").upsert(
    {
      user_id: userId,
      ...(opts.complete ? { completed_at: new Date().toISOString() } : {}),
      org_name: draft.org_name?.trim() || null,
      athlete_pool_size: draft.athlete_pool_size ?? null,
      sports: draft.sports?.length ? draft.sports : null,
      regions: draft.regions?.length ? draft.regions : null,
      level_focus: draft.level_focus?.length ? draft.level_focus : null,
      evaluation_focus: draft.evaluation_focus?.length ? draft.evaluation_focus : null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/* ---------------------------------- Coach --------------------------------- */

export const COACH_AGE_GROUPS = [
  "8U",
  "10U",
  "12U",
  "14U",
  "16U",
  "18U",
  "College",
  "Adult / Pro",
] as const;

export const COACH_DISCIPLINES = [
  "Hitting",
  "Pitching",
  "Catching",
  "Infield",
  "Outfield",
  "Base running",
  "Strength & speed",
  "Arm care",
  "Mental performance",
] as const;

export interface CoachContextDraft {
  org_name?: string | null;
  program_name?: string | null;
  seasons_run?: number | null;
  athlete_count?: number | null;
  age_groups?: string[];
  primary_disciplines?: string[];
  coaching_philosophy?: string | null;
}

/** See saveScoutContext — `complete` stamps the explicit completion flag. */
export async function saveCoachContext(
  userId: string,
  draft: CoachContextDraft,
  opts: { complete?: boolean } = {},
) {
  const { error } = await supabase.from("coach_context").upsert(
    {
      user_id: userId,
      ...(opts.complete ? { completed_at: new Date().toISOString() } : {}),
      org_name: draft.org_name?.trim() || null,
      program_name: draft.program_name?.trim() || null,
      seasons_run: draft.seasons_run ?? null,
      athlete_count: draft.athlete_count ?? null,
      age_groups: draft.age_groups?.length ? draft.age_groups : null,
      primary_disciplines: draft.primary_disciplines?.length ? draft.primary_disciplines : null,
      coaching_philosophy: draft.coaching_philosophy?.trim() || null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/* --------------------------------- Helpers -------------------------------- */

export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function positiveIntOrNull(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
