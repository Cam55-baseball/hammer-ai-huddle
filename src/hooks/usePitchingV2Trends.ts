/**
 * PIE V2 — trends hook. Derives session/7d/30d/90d aggregates from
 * canonical asb_events. Pure derivation — no separate storage.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PieV2SessionAggregate } from "@/lib/pieV2/types";

export interface PieV2TrendsWindow {
  window: "7d" | "30d" | "90d";
  aggregates: PieV2SessionAggregate[];
}

export function usePitchingV2Trends(athleteId: string | undefined) {
  return useQuery<PieV2TrendsWindow[]>({
    queryKey: ["pie-v2-trends", athleteId],
    enabled: !!athleteId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!athleteId) return [];
      const now = new Date();
      const since = new Date(now.getTime() - 90 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("asb_events")
        .select("payload, occurred_at")
        .eq("athlete_id", athleteId)
        .eq("topic_id", "pitching.v2.session_aggregate")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      const aggs: PieV2SessionAggregate[] = (data ?? []).map(
        (r) => (r as unknown as { payload: PieV2SessionAggregate }).payload,
      );
      const sliceSince = (days: number) => {
        const cutoff = new Date(now.getTime() - days * 86400_000).getTime();
        return aggs.filter((a) => new Date(a.computed_at).getTime() >= cutoff);
      };
      return [
        { window: "7d", aggregates: sliceSince(7) },
        { window: "30d", aggregates: sliceSince(30) },
        { window: "90d", aggregates: aggs },
      ];
    },
  });
}
