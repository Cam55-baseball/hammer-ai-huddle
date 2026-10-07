import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { bestsOf, sessionsFromLogs } from "@/lib/speed/speedEngine";

/** Past timed speed sessions (before today) for break-day and plateau checks. */
export function useSpeedHistory(beforeDate: string) {
  const { user } = useOptionalAuth();
  const { data } = useQuery({
    queryKey: ["speed-history", user?.id, beforeDate],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("wk_session_logs" as any)
        .select("plan_date, distance_feet_completed, metrics")
        .eq("user_id", user!.id).in("metrics->>kind", ["sprint_time", "speed_rpe"]).lt("plan_date", beforeDate)
        .order("plan_date", { ascending: false }).limit(500);
      if (error) throw error;
      return sessionsFromLogs((data ?? []) as any);
    },
  });
  const sessions = data ?? [];
  return { sessions, bests: bestsOf(sessions), newestFirst: [...sessions].reverse() };
}
