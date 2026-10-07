import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { BAREFOOT_PAIN_AREAS, bestsOf, sessionsFromLogs, type BarefootEvent } from "@/lib/speed/speedEngine";

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
        .eq("user_id", user!.id).in("metrics->>kind", ["sprint_time", "speed_rpe", "speed_checkin"]).lt("plan_date", beforeDate)
        .order("plan_date", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const rows = data ?? [];
  const sessions = sessionsFromLogs(rows);
  // Barefoot gate inputs: each speed session, each pain-free check-in day, and each check-in with foot/lower-leg pain.
  const events: BarefootEvent[] = [];
  for (const s of sessions) events.push({ kind: "session", date: s.date });
  for (const r of rows) if (r.metrics?.kind === "speed_checkin") {
    const areas: string[] = r.metrics.painAreas ?? [];
    events.push(areas.some((a) => BAREFOOT_PAIN_AREAS.includes(a)) ? { kind: "pain", date: r.plan_date, areas } : { kind: "healthy_day", date: r.plan_date });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "pain" ? 1 : -1));
  return { barefootEvents: events, sessions, bests: bestsOf(sessions), newestFirst: [...sessions].reverse() };
}
