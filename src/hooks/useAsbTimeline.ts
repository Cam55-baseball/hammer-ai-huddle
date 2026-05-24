import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AsbEventRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role: string;
  actor_id: string | null;
  occurred_at: string;
  ingested_at: string;
  effective_at: string;
  valid_from: string;
  valid_to: string | null;
  payload: Record<string, unknown>;
  engine_version: string;
  idempotency_key: string;
  causality_refs: unknown;
  lineage_refs: unknown;
}

export interface AsbTimelineCursor {
  occurred_at: string;
  event_id: string;
}

export interface UseAsbTimelineOptions {
  athleteId?: string | null;
  pageSize?: number;
  cursor?: AsbTimelineCursor | null;
}

export interface AsbTimelinePage {
  rows: AsbEventRow[];
  nextCursor: AsbTimelineCursor | null;
}

const COLS =
  "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs";

/**
 * Keyset pagination on (occurred_at desc, event_id desc).
 * Fetches pageSize+1 rows; the extra row, if present, becomes the nextCursor.
 * No aggregation, no smoothing — raw ledger rows only.
 */
export function useAsbTimeline({ athleteId, pageSize = 50, cursor = null }: UseAsbTimelineOptions) {
  return useQuery({
    queryKey: ["asb-timeline", athleteId, pageSize, cursor?.occurred_at ?? null, cursor?.event_id ?? null],
    enabled: !!athleteId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AsbTimelinePage> => {
      let q = supabase
        .from("asb_events")
        .select(COLS)
        .eq("athlete_id", athleteId!)
        .order("occurred_at", { ascending: false })
        .order("event_id", { ascending: false })
        .limit(pageSize + 1);

      if (cursor) {
        // (occurred_at, event_id) < (cursor.occurred_at, cursor.event_id) in descending order
        q = q.or(
          `occurred_at.lt.${cursor.occurred_at},and(occurred_at.eq.${cursor.occurred_at},event_id.lt.${cursor.event_id})`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as AsbEventRow[];
      let nextCursor: AsbTimelineCursor | null = null;
      if (rows.length > pageSize) {
        const tail = rows[pageSize];
        nextCursor = { occurred_at: tail.occurred_at, event_id: tail.event_id };
      }
      return { rows: rows.slice(0, pageSize), nextCursor };
    },
  });
}
