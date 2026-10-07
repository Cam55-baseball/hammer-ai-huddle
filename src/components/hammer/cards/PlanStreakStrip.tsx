/**
 * PlanStreakStrip — Round 8 Step 1 (screen only; reads, never changes the plan).
 * Streak = planned days in a row with at least one card marked Done.
 * Days with no plan (rest/recovery-only) never break the streak.
 * Milestones celebrate total training days once per device.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MILESTONES = [1, 7, 14, 30, 50, 100, 200, 365];
const SEEN_KEY = "hm_milestones_seen";

export function computeStreak(rows: ReadonlyArray<{ plan_date: string; status: string }>, today: string) {
  const byDay = new Map<string, boolean>();
  for (const r of rows) {
    const done = r.status === "completed";
    byDay.set(r.plan_date, (byDay.get(r.plan_date) ?? false) || done);
  }
  const days = [...byDay.keys()].sort().reverse();
  let streak = 0;
  for (const d of days) {
    if (d > today) continue;
    if (byDay.get(d)) streak++;
    else if (d === today) continue; // today isn't over yet
    else break;
  }
  const total = [...byDay.values()].filter(Boolean).length;
  return { streak, total };
}

export function PlanStreakStrip() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-CA");
  const { data } = useQuery({
    queryKey: ["plan-streak", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("wk_prescriptions")
        .select("plan_date,status")
        .eq("user_id", user!.id)
        .gte("plan_date", since)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Array<{ plan_date: string; status: string }>;
    },
  });
  const { streak, total } = useMemo(() => computeStreak(data ?? [], today), [data, today]);
  const next = MILESTONES.find((m) => m > total) ?? null;

  useEffect(() => {
    if (!total) return;
    const hit = [...MILESTONES].reverse().find((m) => m <= total);
    if (!hit) return;
    try {
      const seen: number[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
      if (seen.includes(hit)) return;
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, hit]));
      toast.success(hit === 1 ? "First training day done!" : `Milestone: ${hit} training days done!`);
    } catch { /* storage unavailable */ }
  }, [total]);

  if (!data || total === 0) return null;
  return (
    <div data-streak-strip className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border px-3 py-2 text-[12px]">
      <span className="flex items-center gap-1 font-medium text-foreground">
        <Flame className="h-4 w-4 text-primary" aria-hidden />Streak: {streak} day{streak === 1 ? "" : "s"}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" aria-hidden />Training days done: {total}
        {next ? ` · next milestone: ${next}` : ""}
      </span>
    </div>
  );
}
