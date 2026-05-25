import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

const COLS =
  "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs";

/**
 * Single read-only pull of canonical ASB events for an entire coach roster.
 * RLS enforces visibility (is_coach_of). No writes, no smoothing.
 */
export function useCoachRosterRows(
  athleteIds: string[],
  opts: { days?: number; limit?: number } = {},
) {
  const days = opts.days ?? 14;
  const limit = opts.limit ?? 2000;
  const key = [...athleteIds].sort().join(",");

  return useQuery({
    queryKey: ["coach-roster-rows", key, days, limit],
    enabled: athleteIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<AsbEventRow[]> => {
      const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("asb_events")
        .select(COLS)
        .in("athlete_id", athleteIds)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .order("event_id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AsbEventRow[];
    },
  });
}
