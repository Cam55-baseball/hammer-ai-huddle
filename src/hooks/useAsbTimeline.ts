import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AsbEventRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role: string | null;
  actor_id: string | null;
  occurred_at: string;
  ingested_at: string | null;
  effective_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  payload: Record<string, unknown> | null;
  engine_version: string | null;
  idempotency_key: string | null;
  causality_refs: unknown;
  lineage_refs: unknown;
}

export interface UseAsbTimelineOptions {
  athleteId?: string | null;
  pageSize?: number;
}

export function useAsbTimeline({ athleteId, pageSize = 50 }: UseAsbTimelineOptions) {
  return useQuery({
    queryKey: ["asb-timeline", athleteId, pageSize],
    enabled: !!athleteId,
    queryFn: async (): Promise<AsbEventRow[]> => {
      const { data, error } = await supabase
        .from("asb_events")
        .select(
          "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs"
        )
        .eq("athlete_id", athleteId!)
        .order("occurred_at", { ascending: false })
        .limit(pageSize);
      if (error) throw error;
      return (data ?? []) as AsbEventRow[];
    },
  });
}
