/**
 * CardDashboard — Round 8 Step 2e (screen only; reads logs, never changes the plan).
 * speed: best and latest sprint time per distance · lift: verified max history ·
 * practice: minutes in the last 7 and 28 days.
 */
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { speedTier, worldClassFor } from "@/lib/speed/speedEngine";
import { verifiedMax, type LogRow } from "@/lib/lift/verifiedMax";

type Row = LogRow & { movement_slug: string; distance_feet_completed: number | null; duration_seconds_completed: number | null };

export function summarizeSprints(rows: Row[]) {
  const by = new Map<number, { best: number; latest: number; latestDate: string; reps: number }>();
  for (const r of rows) {
    const m = (r.metrics ?? {}) as any;
    const t = Number(m.sprint_time_s), d = Number(r.distance_feet_completed);
    if (m.kind !== "sprint_time" || !(t > 0) || !(d > 0)) continue;
    const cur = by.get(d);
    if (!cur) by.set(d, { best: t, latest: t, latestDate: r.plan_date, reps: 1 });
    else {
      cur.best = Math.min(cur.best, t); cur.reps++;
      if (r.plan_date >= cur.latestDate) { cur.latest = t; cur.latestDate = r.plan_date; }
    }
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([feet, v]) => ({ yards: Math.round(feet / 3), ...v }));
}

export function summarizeLift(rows: Row[]) {
  const slugs = [...new Set(rows.map((r) => r.movement_slug))];
  return slugs.map((slug) => {
    const mine = rows.filter((r) => r.movement_slug === slug).sort((a, b) => a.plan_date.localeCompare(b.plan_date));
    const now = verifiedMax(mine);
    const dates = [...new Set(mine.map((r) => r.plan_date))];
    const before = dates.length > 1 ? verifiedMax(mine.filter((r) => r.plan_date < dates[dates.length - 1])) : null;
    return { slug, now, before };
  }).filter((x) => x.now != null);
}

export function summarizePractice(rows: Row[], today: string) {
  const day = (n: number) => new Date(new Date(today + "T12:00:00").getTime() - n * 86400000).toISOString().slice(0, 10);
  const since7 = day(6), since28 = day(27);
  let m7 = 0, m28 = 0, n28 = 0;
  for (const r of rows) {
    if ((r.metrics as any)?.kind !== "practice") continue;
    const min = Math.round((r.duration_seconds_completed ?? 0) / 60);
    if (r.plan_date >= since28 && r.plan_date <= today) { m28 += min; n28++; if (r.plan_date >= since7) m7 += min; }
  }
  return { m7, m28, n28 };
}

const pretty = (slug: string) => slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function CardDashboard({ mode, slugs }: { mode: "speed" | "lift" | "practice"; slugs?: string[] }) {
  const { user } = useOptionalAuth();
  const { data } = useQuery({
    queryKey: ["card-dash", user?.id, mode, (slugs ?? []).join(",")],
    enabled: !!user?.id && (mode !== "lift" || (slugs?.length ?? 0) > 0),
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
      let q = supabase.from("wk_session_logs" as any)
        .select("plan_date, movement_slug, load_used, reps_completed, metrics, distance_feet_completed, duration_seconds_completed")
        .eq("user_id", user!.id).gte("plan_date", since).limit(2000);
      if (mode === "lift") q = q.in("movement_slug", slugs!);
      else q = q.eq("metrics->>kind", mode === "speed" ? "sprint_time" : "practice");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  if (!data) return null;
  const today = new Date().toLocaleDateString("en-CA");
  let body: React.ReactNode = null;
  if (mode === "speed") {
    const s = summarizeSprints(data);
    if (!s.length) return null;
    body = s.map((x) => (
      <li key={x.yards}>{x.yards} yd — best time: {x.best.toFixed(2)}s · latest: {x.latest.toFixed(2)}s · reps timed: {x.reps}{(() => { const w = worldClassFor("baseball", x.yards) ?? worldClassFor("softball", x.yards); return w ? ` · speed level: ${speedTier(x.best, w)}` : ""; })()}</li>
    ));
  } else if (mode === "lift") {
    const s = summarizeLift(data);
    if (!s.length) return null;
    body = s.map((x) => (
      <li key={x.slug}>{pretty(x.slug)} — max: {x.now} lb{x.before && x.now! > x.before ? ` (up ${x.now! - x.before} lb)` : ""}</li>
    ));
  } else {
    const s = summarizePractice(data, today);
    if (!s.n28) return null;
    body = <li>Practice minutes: {s.m7} this week · {s.m28} in 4 weeks ({s.n28} sessions)</li>;
  }
  return (
    <div data-card-dashboard={mode} className="rounded-md border border-border bg-muted/30 p-2 text-[11px]">
      <div className="mb-1 flex items-center gap-1 font-medium text-foreground"><BarChart3 className="h-3.5 w-3.5" aria-hidden />Your numbers</div>
      <ul className="space-y-0.5 text-muted-foreground">{body}</ul>
    </div>
  );
}
