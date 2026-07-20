/**
 * Concept-tag mastery aggregation.
 * Provides safe defaults when the concept tables are empty so the ladder
 * still renders without seeded data.
 */
import { supabase } from "@/integrations/supabase/client";

export interface IqConcept {
  id: string;
  sport: string;
  key: string;
  label: string;
  description: string | null;
}

export interface IqConceptMastery {
  concept_id: string;
  mastery_score: number;
  last_touched_at: string | null;
}

export async function fetchConcepts(sport: "baseball" | "softball" | "both"): Promise<IqConcept[]> {
  const filter = sport === "both" ? ["baseball", "softball", "both"] : [sport, "both"];
  const { data, error } = await supabase
    .from("iq_concept_tags")
    .select("*")
    .in("sport", filter);
  if (error) return [];
  return (data ?? []) as unknown as IqConcept[];
}

export async function fetchMyConceptMastery(userId: string): Promise<IqConceptMastery[]> {
  const { data, error } = await supabase
    .from("iq_user_concept_mastery")
    .select("concept_id, mastery_score, last_touched_at")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []) as unknown as IqConceptMastery[];
}

/** Apply the linear weekly decay used by the nightly job so the client
 *  can preview drift between cron runs. */
export function decayMastery(score: number, lastTouchedISO: string | null, pctPerWeek = 5): number {
  if (!lastTouchedISO) return score;
  const now = Date.now();
  const then = new Date(lastTouchedISO).getTime();
  if (!Number.isFinite(then)) return score;
  const weeks = Math.max(0, (now - then) / (7 * 24 * 60 * 60 * 1000));
  const drop = weeks * pctPerWeek;
  return Math.max(0, score - drop);
}
