import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readiness10 } from "@/hooks/useRunningReadiness";
import {
  GREENLIGHT_AREAS, areaWeeks, colorsFor, greenlightLevel, mondayOf,
  type DayCheckIn, type GreenlightArea, type GreenlightResult,
} from "../../supabase/functions/_shared/wic/progression/greenlight";

const shift = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const GREENLIGHT_WEEKS = 8;

export type GreenlightMap = Partial<Record<GreenlightArea, GreenlightResult>>;

/**
 * Owner Nov 1 round 4: greenlight results per area from the player's own saved cards,
 * logs and check-ins over the last 8 finished weeks. A read failure returns null
 * (every area holds — never rushes).
 */
export function useGreenlight(userId: string | undefined, today: string, age: number | null) {
  return useQuery<GreenlightMap | null>({
    queryKey: ["greenlight", userId, today, age],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const from = shift(mondayOf(today), -7 * GREENLIGHT_WEEKS), to = shift(mondayOf(today), -1);
      const [rx, logs, quiz] = await Promise.all([
        supabase.from("wk_prescriptions").select("id, plan_date, slot").eq("user_id", userId!).gte("plan_date", from).lte("plan_date", to).limit(3000),
        supabase.from("wk_session_logs").select("prescription_id").eq("user_id", userId!).gte("plan_date", from).lte("plan_date", to).limit(3000),
        supabase.from("vault_focus_quizzes").select("entry_date, physical_readiness, pain_location, pain_scale").eq("user_id", userId!).gte("entry_date", from).lte("entry_date", to).limit(400),
      ]);
      if (rx.error || logs.error || quiz.error) return null;
      const logged = new Set(((logs.data ?? []) as any[]).map((l) => l.prescription_id).filter(Boolean));
      const byDay = new Map<string, DayCheckIn>();
      for (const q of (quiz.data ?? []) as any[]) {
        const r = q.physical_readiness == null ? null : Number(q.physical_readiness);
        const norm = r == null || !Number.isFinite(r) ? null : r <= 5 ? (r - 1) / 4 : (readiness10(r) ?? 0) / 10;
        const pain = (Array.isArray(q.pain_location) && q.pain_location.length > 0) || Number(q.pain_scale ?? 0) > 0;
        const prev = byDay.get(q.entry_date);
        byDay.set(q.entry_date, { date: q.entry_date, readiness: prev?.readiness != null && norm != null ? Math.min(prev.readiness, norm) : norm ?? prev?.readiness ?? null, pain: pain || !!prev?.pain });
      }
      const checkIns = [...byDay.values()];
      const weeks = areaWeeks(today, (rx.data ?? []) as any[], logged);
      const out: GreenlightMap = {};
      for (const a of GREENLIGHT_AREAS) out[a] = greenlightLevel(a, colorsFor(weeks[a], checkIns, today), age);
      return out;
    },
  });
}
