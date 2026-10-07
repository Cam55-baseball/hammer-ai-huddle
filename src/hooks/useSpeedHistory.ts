import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isBarefootPain, bestsOf, sessionsFromLogs, type BarefootEvent } from "@/lib/speed/speedEngine";

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
        .eq("user_id", user!.id).in("metrics->>kind", ["sprint_time", "speed_rpe", "speed_checkin", "barefoot_test", "barefoot_stage_up"]).lt("plan_date", beforeDate)
        .order("plan_date", { ascending: false }).limit(1000);
      if (error) throw error;
      // Daily check-ins also count for the barefoot pain-free streak (foot/ankle/shin/Achilles/calf).
      const { data: quiz } = await supabase.from("vault_focus_quizzes")
        .select("entry_date, pain_location").eq("user_id", user!.id).lt("entry_date", beforeDate)
        .order("entry_date", { ascending: false }).limit(400);
      const q = ((quiz ?? []) as any[]).map((r) => ({ plan_date: r.entry_date, metrics: { kind: "speed_checkin", painAreas: r.pain_location ?? [] } }));
      return [...(data ?? []) as any[], ...q];
    },
  });
  const rows = data ?? [];
  const sessions = sessionsFromLogs(rows);
  // Barefoot gate inputs: each speed session, each pain-free check-in day, and each check-in with foot/lower-leg pain.
  const events: BarefootEvent[] = [];
  for (const s of sessions) events.push({ kind: "session", date: s.date });
  for (const r of rows) {
    const k = r.metrics?.kind;
    if (k === "speed_checkin") {
      const areas: string[] = r.metrics.painAreas ?? [];
      events.push(isBarefootPain(areas) ? { kind: "pain", date: r.plan_date, areas } : { kind: "healthy_day", date: r.plan_date });
    } else if (k === "barefoot_test") events.push({ kind: r.metrics.passed ? "test_pass" : "test_fail", date: r.plan_date });
    else if (k === "barefoot_stage_up") events.push({ kind: "stage_up", date: r.plan_date, to: Number(r.metrics.to) });
  }
  // Same-day order: check-ins first, then sessions/tests, then move-ups; pain last.
  const rank = (k: string) => (k === "healthy_day" ? 0 : k === "pain" ? 3 : k === "stage_up" ? 2 : 1);
  events.sort((a, b) => a.date.localeCompare(b.date) || rank(a.kind) - rank(b.kind));
  return { barefootEvents: events, sessions, bests: bestsOf(sessions), newestFirst: [...sessions].reverse() };
}
