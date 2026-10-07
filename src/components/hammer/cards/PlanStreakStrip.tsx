/**
 * PlanStreakStrip — Round 8 Step 1 (screen only; reads, never changes the plan).
 * Streak = planned days in a row with at least one card marked Done.
 * Days with no plan (rest/recovery-only) never break the streak.
 * Flame: lights at 5 days, glows at 25, changes color every 100.
 * Milestones: completed workouts (cards marked Done) at 10/50/100/200/350/500/700/1000,
 * each once per device with confetti + phone vibration.
 */
import { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConfettiEffect } from "@/components/bounce-back-bay/ConfettiEffect";

export const MILESTONES = [10, 50, 100, 200, 350, 500, 700, 1000];
const SEEN_KEY = "hm_workout_milestones_seen";
export const FLAME_LIT_AT = 5;
export const FLAME_GLOW_AT = 25;
// Color changes every 100 days; semantic tokens only.
const FLAME_COLORS = ["text-primary", "text-accent-foreground", "text-destructive", "text-secondary-foreground"];

export function computeStreak(rows: ReadonlyArray<{ plan_date: string; status: string }>, today: string) {
  const byDay = new Map<string, boolean>();
  let workouts = 0;
  for (const r of rows) {
    const done = r.status === "completed";
    if (done && r.plan_date <= today) workouts++;
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
  return { streak, workouts };
}

export function flameState(streak: number) {
  return {
    lit: streak >= FLAME_LIT_AT,
    glow: streak >= FLAME_GLOW_AT,
    colorClass: FLAME_COLORS[Math.floor(streak / 100) % FLAME_COLORS.length],
  };
}

function celebrate() {
  try {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    root.render(<ConfettiEffect />);
    setTimeout(() => { root.unmount(); el.remove(); }, 5000);
  } catch { /* no DOM */ }
  try { navigator.vibrate?.([100, 50, 100]); } catch { /* unsupported */ }
}

export function PlanStreakStrip() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-CA");
  const { data } = useQuery({
    queryKey: ["plan-streak", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_prescriptions")
        .select("plan_date,status")
        .eq("user_id", user!.id)
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as Array<{ plan_date: string; status: string }>;
    },
  });
  const { streak, workouts } = useMemo(() => computeStreak(data ?? [], today), [data, today]);
  const next = MILESTONES.find((m) => m > workouts) ?? null;
  const flame = flameState(streak);

  useEffect(() => {
    if (!workouts) return;
    const hit = [...MILESTONES].reverse().find((m) => m <= workouts);
    if (!hit) return;
    try {
      const seen: number[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
      if (seen.includes(hit)) return;
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...MILESTONES.filter((m) => m <= hit && !seen.includes(m))]));
      celebrate();
      toast.success(`Milestone: ${hit.toLocaleString()} workouts done!`);
    } catch { /* storage unavailable */ }
  }, [workouts]);

  if (!data || workouts === 0) return null;
  return (
    <div data-streak-strip className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border px-3 py-2 text-[12px]">
      <span className="flex items-center gap-1 font-medium text-foreground" data-flame={flame.glow ? "glow" : flame.lit ? "lit" : "off"}>
        <Flame
          aria-hidden
          className={[
            "h-4 w-4",
            flame.lit ? flame.colorClass : "text-muted-foreground opacity-50",
            flame.glow ? "drop-shadow-[0_0_6px_currentColor] motion-safe:animate-pulse" : "",
          ].join(" ")}
        />
        Streak: {streak} day{streak === 1 ? "" : "s"}
        {!flame.lit ? ` · flame lights at ${FLAME_LIT_AT}` : ""}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" aria-hidden />Workouts done: {workouts.toLocaleString()}
        {next ? ` · next milestone: ${next.toLocaleString()}` : ""}
      </span>
    </div>
  );
}
