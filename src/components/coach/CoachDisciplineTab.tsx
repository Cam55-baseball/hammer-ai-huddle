import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { completion, currentStreak, missedDays, windowDays, loggingConsistency, adherenceLinks, type DayRecord } from "@/lib/discipline/discipline";

export function CoachDisciplineTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["coach-discipline", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_discipline" as any, { _athlete: athleteId });
      if (error) throw error;
      return data as { days: Array<{ date: string; prescribed: number; done: number }>; skips: Array<{ slot: string; skipped: number; prescribed: number }>; to: string };
    },
  });
  const trends = useQuery({
    queryKey: ["coach-discipline-links", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_trends", { _athlete: athleteId });
      if (error) throw error;
      return (data ?? []).flatMap((m: any) => ((m.recent ?? []) as any[]).map((o) => ({
        metric: m.metric_key as string, value: Number(o.value), date: String(o.recorded_at).slice(0, 10), unit: o.unit ?? m.unit,
      })));
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-muted-foreground">Could not load discipline.</p>;

  const past: DayRecord[] = data.days.filter((d) => d.date < data.to).map((d) => ({ ...d, logged: d.done > 0 }));
  const end = past[past.length - 1]?.date ?? data.to;
  const pct = (n: 7 | 28 | 90) => { const c = completion(windowDays(past, end, n)); return c === null ? "Not enough data" : `${c}%`; };

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Work done vs work set (days before today)</h3>
        <p className="text-sm">Last 7 days: {pct(7)}</p>
        <p className="text-sm">Last 28 days: {pct(28)}</p>
        <p className="text-sm">Last 90 days: {pct(90)}</p>
        <p className="text-sm">Current streak (days with all work done): {past.length ? currentStreak(past) : "Not enough data"}</p>
        <p className="text-sm">Missed days, last 90 (work set, nothing logged): {past.length ? missedDays(past) : "Not enough data"}</p>
        <p className="text-sm">Logging consistency, last 28 days (days with work set that have a saved log): {(() => { const c = loggingConsistency(windowDays(past, end, 28)); return c === null ? "Not enough data" : `${c}%`; })()}</p>
        <p className="text-xs text-muted-foreground">Source: the player's plan and their saved workout logs.</p>
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Most skipped, by card type (last 90 days)</h3>
        {data.skips.length === 0 ? <p className="text-sm text-muted-foreground">Not enough data</p> :
          data.skips.map((s) => <p key={s.slot} className="text-sm">Card type {s.slot}: skipped {s.skipped} of {s.prescribed}</p>)}
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Links between doing the work and results</h3>
        <p className="text-xs text-muted-foreground">Each result is paired with how much work was done in the 28 days before it. A link never shows cause. At least 8 results are needed.</p>
        {(() => {
          const links = adherenceLinks(past, trends.data ?? []);
          if (!links.length) return <p className="text-sm text-muted-foreground">Not enough data</p>;
          return links.slice(0, 8).map((l) => (
            <p key={l.metric} className="text-sm">
              Result {l.metric.replace(/_/g, " ")}{l.unit ? ` (${l.unit})` : ""}: {l.result.label}
              {l.from ? ` · ${l.from} to ${l.to}` : ""}
            </p>
          ));
        })()}
      </Card>
    </div>
  );
}
