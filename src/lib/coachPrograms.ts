/** Coach setup answers (team, ages and levels, focus) for coach search, matching and organization views. */
import { supabase } from "@/integrations/supabase/client";

export type CoachProgram = { user_id: string; org_name: string | null; program_name: string | null; age_groups: string[] | null; primary_disciplines: string[] | null };

export async function fetchCoachPrograms(ids: string[]): Promise<Map<string, CoachProgram>> {
  if (!ids.length) return new Map();
  const { data } = await (supabase as any).rpc("coach_program_summaries", { _ids: ids.slice(0, 200) });
  return new Map(((data ?? []) as CoachProgram[]).map((r) => [r.user_id, r]));
}

/** True when the search words name one of the coach's age groups or levels (e.g. "12U", "high school"). */
export function coachMatchesAges(p: CoachProgram | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!p?.age_groups?.length || q.length < 2) return false;
  return p.age_groups.some((a) => a.toLowerCase() === q || a.toLowerCase().includes(q));
}
