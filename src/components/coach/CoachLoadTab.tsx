import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { armEntryLine, mergedPitchDays, pitchDayLine, weeklyPitchTotal, weeklyThrowTotal, type CoachLoad } from "@/lib/coach/load";

/**
 * Coach "Body load" tab — the player's last 7 days of throwing work:
 * arm-ledger entries, bullpen/outing pitch logs, and pitches thrown in
 * logged games. Counts only what was actually logged; missing = said so.
 */
export function CoachLoadTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-load", athleteId],
    queryFn: async (): Promise<CoachLoad> => {
      const { data, error } = await supabase.rpc("coach_athlete_load", { _athlete: athleteId });
      if (error) throw error;
      return data as unknown as CoachLoad;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading body load…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Body load is not available.</p>;

  const days = mergedPitchDays(data);
  const pitchTotal = weeklyPitchTotal(data);
  const throwTotal = weeklyThrowTotal(data);
  const empty = days.length === 0 && (data.arm_entries ?? []).length === 0;

  if (empty)
    return (
      <p className="text-sm text-muted-foreground" data-testid="coach-load-empty">
        Nothing logged in the last 7 days — no throws, bullpens or game pitches recorded.
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Last 7 days, counted only from what the player actually logged.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pitches this week (bullpens, outings and games)</p>
          <p className="text-lg font-semibold" data-testid="coach-load-pitch-total">{pitchTotal}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Throws logged this week</p>
          <p className="text-lg font-semibold" data-testid="coach-load-throw-total">{throwTotal}</p>
        </div>
      </div>

      {days.length > 0 && (
        <div className="rounded-lg border p-3 space-y-1.5">
          <p className="text-sm font-medium">Pitches by day</p>
          {days.map((d) => (
            <div key={d.date} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{d.date}</span>
              <span>{pitchDayLine(d)}</span>
            </div>
          ))}
        </div>
      )}

      {(data.arm_entries ?? []).length > 0 && (
        <div className="rounded-lg border p-3 space-y-1.5">
          <p className="text-sm font-medium">Throws logged</p>
          {(data.arm_entries ?? []).map((e, i) => (
            <div key={`${e.entry_date}-${e.throw_type}-${i}`} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{e.entry_date}</span>
              <span>{armEntryLine(e)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
