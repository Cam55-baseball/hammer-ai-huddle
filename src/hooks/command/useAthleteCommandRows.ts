import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

const COLS =
  "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs";

/**
 * Single read-only pull of recent ASB events for the active athlete.
 * Window: last 30 days, capped. No writes, no smoothing, no derived storage.
 * One round trip feeds every Command card via pure projections.
 */
export function useAthleteCommandRows(opts: { days?: number; limit?: number } = {}) {
  const { user } = useAuth();
  const athleteId = user?.id ?? null;
  const days = opts.days ?? 30;
  const limit = opts.limit ?? 500;

  return useQuery({
    queryKey: ["asb-command-rows", athleteId, days, limit],
    enabled: !!athleteId,
    staleTime: 30_000,
    queryFn: async (): Promise<AsbEventRow[]> => {
      const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("asb_events")
        .select(COLS)
        .eq("athlete_id", athleteId!)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .order("event_id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AsbEventRow[];
    },
  });
}
