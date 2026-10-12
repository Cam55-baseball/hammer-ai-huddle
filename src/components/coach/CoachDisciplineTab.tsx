import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { completion, currentStreak, missedDays, windowDays, type DayRecord } from "@/lib/discipline/discipline";

export function CoachDisciplineTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["coach-discipline", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_discipline" as any, { _athlete: athleteId });
      if (error) throw error;
      return data as { days: Array<{ date: string; prescribed: number; done: number }>; skips: Array<{ slot: string; skipped: number; prescribed: number }>; to: string };
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
        <p className="text-xs text-muted-foreground">Source: the player's plan and their saved workout logs.</p>
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Most skipped, by card type (last 90 days)</h3>
        {data.skips.length === 0 ? <p className="text-sm text-muted-foreground">Not enough data</p> :
          data.skips.map((s) => <p key={s.slot} className="text-sm">Card type {s.slot}: skipped {s.skipped} of {s.prescribed}</p>)}
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold">Links between doing the work and results</h3>
        <p className="text-sm text-muted-foreground">Not enough data</p>
      </Card>
    </div>
  );
}
