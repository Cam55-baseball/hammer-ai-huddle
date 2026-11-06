import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkinDays, checkinFacts, checkinKind, painDays, type Checkin, type CheckinDone } from "@/lib/coach/readiness";

export const HEALTH_CONSENT_LABEL = "Shared only with health consent";

/** Coach "Readiness & pain" tab. Connected coaches always see check-ins (owner Nov 6). */
export function CoachReadinessTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-readiness", athleteId],
    queryFn: async (): Promise<{ shared: boolean; checkins: Checkin[]; completed: CheckinDone[] }> => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_readiness", { _athlete: athleteId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading readiness…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Readiness is not available.</p>;

  const today = new Date().toISOString().slice(0, 10);
  const done = data.completed ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 space-y-1" data-testid="coach-checkin-attendance">
        <p className="text-sm font-medium">Check-ins completed</p>
        <p className="text-sm">Last 7 days: {checkinDays(done, today, 7)} of 7 days</p>
        <p className="text-sm">Last 28 days: {checkinDays(done, today, 28)} of 28 days</p>
        {done.slice(0, 7).map((d, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {checkinKind(d.quiz_type)} · {d.entry_date} · done at {new Date(d.completed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        ))}
        {done.length === 0 && <p className="text-xs text-muted-foreground">No check-ins in the last 28 days.</p>}
        <p className="text-xs text-muted-foreground">Source: athlete-entered.</p>
      </div>

      {(() => {
        const rows = data.checkins.filter((r) => checkinFacts(r).length > 0);
        if (rows.length === 0) return <p className="text-sm text-muted-foreground" data-testid="coach-readiness-empty">No check-in answers in the last 7 days.</p>;
        return (
          <>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Days with pain reported (last 7)</p>
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
          </>
        );
      })()}
    </div>
  );
}
