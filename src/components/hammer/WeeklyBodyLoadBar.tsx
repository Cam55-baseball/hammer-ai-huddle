/**
 * Roadmap 7b — weekly body-load bar. Display only: never changes a card.
 * One segment per day (Mon–Sun): planned hard work (lift, sprint/speed,
 * conditioning, jumps) and whether it was logged.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";

const HARD = new Set(["lift", "speed", "conditioning", "plyo", "jumps", "bat_speed"]);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function WeeklyBodyLoadBar() {
  const { user } = useOptionalAuth();
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return iso(d); });
  const { data } = useQuery({
    queryKey: ["weekly-body-load", user?.id, days[0]],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [rx, logs] = await Promise.all([
        supabase.from("wk_prescriptions" as any).select("plan_date, slot").eq("user_id", user!.id).gte("plan_date", days[0]).lte("plan_date", days[6]),
        supabase.from("wk_session_logs" as any).select("plan_date").eq("user_id", user!.id).gte("plan_date", days[0]).lte("plan_date", days[6]),
      ]);
      const planned = new Map<string, number>();
      for (const r of (rx.data ?? []) as any[]) if (HARD.has(String(r.slot))) planned.set(r.plan_date, (planned.get(r.plan_date) ?? 0) + 1);
      const logged = new Set(((logs.data ?? []) as any[]).map((r) => r.plan_date));
      return { planned, logged };
    },
  });
  if (!data) return null;
  const hardDays = days.filter((d) => (data.planned.get(d) ?? 0) > 0);
  if (!hardDays.length) return null;
  const done = hardDays.filter((d) => data.logged.has(d)).length;
  const today = iso(now);
  return (
    <div data-weekly-body-load className="rounded-lg border border-border p-3">
      <p className="text-sm font-semibold text-foreground">Body load this week: {done} of {hardDays.length} hard days done</p>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const hard = (data.planned.get(d) ?? 0) > 0;
          const isDone = hard && data.logged.has(d);
          return (
            <div key={d} className="text-center">
              <div className={`h-2.5 rounded-full ${!hard ? "bg-muted" : isDone ? "bg-primary" : "bg-primary/30"} ${d === today ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : ""}`} />
              <span className="text-[10px] text-muted-foreground">{DAYS[i]}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Dark = hard day done · light = hard day planned · grey = easy or rest day.</p>
    </div>
  );
}
