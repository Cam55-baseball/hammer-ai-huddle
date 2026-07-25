import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { aggregateRecentPitchingLoad, type RecentPitchingLoad } from "@/lib/hammer/pitching/recentLoad";

/**
 * Fetches the last `days` of pitching logs and aggregates into a
 * per-day pitch total + last-outing summary.
 */
export function useRecentPitchingLoad(days = 7): { data: RecentPitchingLoad | null; loading: boolean } {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["recent-pitching-load", user?.id, days],
    queryFn: async (): Promise<RecentPitchingLoad> => {
      if (!user) return { byDate: {}, weeklyTotal: 0, lastOuting: null };
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromIso = from.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("wk_session_logs")
        .select("plan_date, template_id, movement_slug, metrics")
        .eq("user_id", user.id)
        .gte("plan_date", fromIso)
        .in("template_id", ["bullpen_pitching", "pitching_outing"])
        .order("plan_date", { ascending: false });
      if (error) throw error;
      return aggregateRecentPitchingLoad(data ?? []);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  return { data: q.data ?? null, loading: q.isLoading };
}
