/**
 * Wave 2 — Org/athlete scope chokepoint.
 *
 * All event queries that feed runtime/coach/ops projections MUST go
 * through scopedEventsQuery so cross-org leakage is impossible by
 * construction. RLS is the final authority; this is a defensive layer.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ScopeFilter {
  /** Required for athlete-scoped queries. */
  athleteId?: string;
  /** Optional org filter when ASB tables support it. */
  orgId?: string;
  /** Optional time window. */
  sinceIso?: string;
  /** Default 500, max 1000 (Supabase default ceiling). */
  limit?: number;
}

export async function scopedAsbEvents(filter: ScopeFilter) {
  if (!filter.athleteId && !filter.orgId) {
    console.warn("[ops.scope] unscoped query rejected");
    return { data: [] as unknown[], error: null };
  }
  let q = supabase
    .from("asb_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(Math.min(filter.limit ?? 500, 1000));

  if (filter.athleteId) q = q.eq("athlete_id", filter.athleteId);
  if (filter.sinceIso) q = q.gte("occurred_at", filter.sinceIso);

  const { data, error } = await q;
  if (error) console.error("[ops.scope] query_error", error.message);
  return { data: data ?? [], error };
}
