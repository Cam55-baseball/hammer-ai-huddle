import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkinFacts, checkinKind, painDays, type Checkin } from "@/lib/coach/readiness";

/** Coach "Readiness & pain" tab — last 7 days of check-ins, only when the player shared Health. */
export function CoachReadinessTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-readiness", athleteId],
    queryFn: async (): Promise<{ shared: boolean; checkins: Checkin[] }> => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_readiness", { _athlete: athleteId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading readiness…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Readiness is not available.</p>;
  if (!data.shared)
    return (
      <p className="text-sm text-muted-foreground" data-testid="coach-readiness-not-shared">
        Not shared — this player hasn't turned on Health in their scouting visibility (a parent must agree for players under 18).
      </p>
    );
  const rows = data.checkins.filter((r) => checkinFacts(r).length > 0);
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground" data-testid="coach-readiness-empty">No check-ins in the last 7 days.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Last 7 days, from the player's own check-ins. Source: athlete-entered.</p>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Days with pain reported</p>
        <p className="text-lg font-semibold" data-testid="coach-readiness-paindays">{painDays(rows)} of 7</p>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border p-3 text-sm space-y-0.5">
          <div className="flex justify-between gap-2">
            <span className="font-medium">{checkinKind(r.quiz_type)}</span>
            <span className="text-muted-foreground">{r.entry_date}</span>
          </div>
          {checkinFacts(r).map((f) => <p key={f}>{f}</p>)}
        </div>
      ))}
    </div>
  );
}
