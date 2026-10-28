import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  runningReadiness, type ReadinessCheckin, type RunningReadiness,
} from "../../supabase/functions/_shared/readiness/runningReadiness";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: string, n: number) => iso(new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86_400_000));

/** Readiness check-in score: Today stores 0–10; older rows stored 0–1. */
export function readiness10(score: unknown): number | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? n * 10 : n;
}

/** Running 14-day readiness from the player's own records. Read failures return null (plan stays as before). */
export function useRunningReadiness(today: string = iso(new Date())) {
  const { user } = useAuth();
  return useQuery<RunningReadiness | null>({
    queryKey: ["running-readiness", user?.id, today],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const uid = user!.id;
      const from14 = shift(today, -13), from28 = shift(today, -27);
      const [quiz, asb, logs, rx] = await Promise.all([
        supabase.from("vault_focus_quizzes")
          .select("entry_date, physical_readiness, hours_slept, soreness_locations, pain_location, pain_scale")
          .eq("user_id", uid).gte("entry_date", from14).lte("entry_date", today).limit(200),
        supabase.from("asb_events").select("payload, occurred_at")
          .eq("athlete_id", uid).eq("topic_id", "behavioral.readiness")
          .gte("occurred_at", `${from14}T00:00:00Z`).order("occurred_at", { ascending: false }).limit(60),
        supabase.from("wk_session_logs").select("plan_date, prescription_id")
          .eq("user_id", uid).gte("plan_date", from28).lte("plan_date", today).limit(2000),
        supabase.from("wk_prescriptions").select("id, plan_date")
          .eq("user_id", uid).gte("plan_date", from14).lt("plan_date", today).limit(2000),
      ]);
      if (quiz.error || asb.error || logs.error || rx.error) return null;
      const checkins: ReadinessCheckin[] = (quiz.data ?? []).map((q: any) => ({
        date: q.entry_date, bodyReadiness: q.physical_readiness, hoursSlept: q.hours_slept,
        sorenessAreas: Array.isArray(q.soreness_locations) ? q.soreness_locations.length : null,
        painAreas: Array.isArray(q.pain_location) ? q.pain_location.length : null, painScale: q.pain_scale,
      }));
      const seen = new Set<string>();
      for (const e of (asb.data ?? []) as any[]) {
        const d = String(e.occurred_at).slice(0, 10);
        if (seen.has(d)) continue; seen.add(d);
        const r = readiness10((e.payload as any)?.score);
        if (r != null) checkins.push({ date: d, readiness10: r });
      }
      const units: Record<string, number> = {};
      for (const l of (logs.data ?? []) as any[]) units[l.plan_date] = (units[l.plan_date] ?? 0) + 1;
      const rxIds = new Set(((rx.data ?? []) as any[]).map((r) => r.id));
      const done = new Set(((logs.data ?? []) as any[]).filter((l) => l.prescription_id && rxIds.has(l.prescription_id)).map((l) => l.prescription_id));
      return runningReadiness({ today, checkins, workUnitsByDate: units, prescribedPast14: rxIds.size, completedPast14: done.size, testTrend: null });
    },
  });
}
