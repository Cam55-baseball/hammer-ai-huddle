import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkinDays, checkinFacts, checkinKind, painDays, type Checkin, type CheckinDone } from "@/lib/coach/readiness";

export const HEALTH_CONSENT_LABEL = "Shared only with health consent";
const ASK_BODY =
  "Your coach asked to see your check-in answers (sleep, soreness, pain, energy). To share them, open Settings → Scouting visibility (/athlete/recruiting-consent) and turn on Health. Players under 18 need a parent to agree. You can turn it off anytime.";

/** Coach "Readiness & pain" tab. Check-in attendance always; contents only with health consent. */
export function CoachReadinessTab({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const [asked, setAsked] = useState(false);
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
  const ask = async () => {
    const { error } = await supabase.from("coach_messages").insert({ coach_id: user!.id, athlete_id: athleteId, body: ASK_BODY, parent_copied: true } as any);
    if (error) toast.error("Couldn't send the request.");
    else { setAsked(true); toast.success("Request sent to the player (and parent copy)."); }
  };

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

      {!data.shared ? (
        <div className="rounded-lg border p-3 space-y-2" data-testid="coach-readiness-not-shared">
          <p className="text-sm font-medium">{HEALTH_CONSENT_LABEL}</p>
          <p className="text-xs text-muted-foreground">Check-in answers (readiness, sleep, soreness, pain, energy, notes) are health data. The player turns on Health sharing; a parent must agree for players under 18.</p>
          <Button size="sm" disabled={asked} onClick={ask}>{asked ? "Request sent" : "Ask to turn on health sharing"}</Button>
        </div>
      ) : (() => {
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
