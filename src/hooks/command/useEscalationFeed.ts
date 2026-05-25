import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "./useAthleteCommandRows";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

const ESC_PREFIXES = ["foundation.pattern", "behavioral.escalation", "behavioral.risk"];

function isEscalation(topic: string): boolean {
  return ESC_PREFIXES.some((p) => topic === p || topic.startsWith(p + "."));
}

export interface EscalationItem {
  event: AsbEventRow;
  dispatchedAt: string | null;
  acknowledgedAt: string | null;
}

/**
 * Read-only escalation feed.
 * - Source rows come straight from useAthleteCommandRows (canonical asb_events).
 * - Ack overlay from notification_acks (in_app channel only here).
 * - No new ledger. No notification synthesis.
 */
export function useEscalationFeed(opts: { withinHours?: number } = {}) {
  const within = opts.withinHours ?? 72;
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });

  const filtered = useMemo<AsbEventRow[]>(() => {
    if (!rows) return [];
    const cutoff = Date.now() - within * 3600 * 1000;
    return rows.filter((r) => {
      if (!isEscalation(r.topic_id)) return false;
      const t = Date.parse(r.occurred_at);
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [rows, within]);

  const ackQuery = useQuery({
    queryKey: ["notification-acks", uid, filtered.map((r) => r.event_id)],
    enabled: !!uid && filtered.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notification_acks")
        .select("event_id, channel, dispatched_at, acknowledged_at")
        .eq("user_id", uid!)
        .eq("channel", "in_app")
        .in("event_id", filtered.map((r) => r.event_id));
      return (data ?? []) as Array<{
        event_id: string;
        channel: string;
        dispatched_at: string;
        acknowledged_at: string | null;
      }>;
    },
  });

  const items: EscalationItem[] = useMemo(() => {
    const ackMap = new Map<string, { dispatched_at: string; acknowledged_at: string | null }>();
    (ackQuery.data ?? []).forEach((a) =>
      ackMap.set(a.event_id, { dispatched_at: a.dispatched_at, acknowledged_at: a.acknowledged_at }),
    );
    return filtered.map((event) => {
      const a = ackMap.get(event.event_id);
      return {
        event,
        dispatchedAt: a?.dispatched_at ?? null,
        acknowledgedAt: a?.acknowledged_at ?? null,
      };
    });
  }, [filtered, ackQuery.data]);

  const unackedCount = items.filter((i) => !i.acknowledgedAt).length;

  return {
    items,
    unackedCount,
    loading: isLoading || ackQuery.isLoading,
  };
}

/**
 * Acknowledge a single escalation (in-app channel).
 * Upserts notification_acks row stamped with acknowledged_at.
 * Append-on-first, ack-update-on-second; replay-safe — never touches asb_events.
 */
export function useAcknowledgeEscalation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (eventId: string) => {
    if (!user?.id) return;
    const nowIso = new Date().toISOString();
    // Upsert (insert-or-update on (user_id, event_id, channel) unique)
    await (supabase as any)
      .from("notification_acks")
      .upsert(
        {
          user_id: user.id,
          event_id: eventId,
          channel: "in_app",
          dispatched_at: nowIso,
          acknowledged_at: nowIso,
        },
        { onConflict: "user_id,event_id,channel" },
      );
    qc.invalidateQueries({ queryKey: ["notification-acks", user.id] });
  };
}
