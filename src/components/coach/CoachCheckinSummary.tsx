import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { checkinDays, latestDayAnswers, type Checkin, type CheckinDone } from "@/lib/coach/readiness";

/** Check-ins for Development / Discipline: attendance always; answers only with health consent. */
export function CoachCheckinSummary({ athleteId }: { athleteId: string }) {
  const { data } = useQuery({
    queryKey: ["coach-athlete-readiness", athleteId],
    queryFn: async (): Promise<{ shared: boolean; checkins: Checkin[]; completed: CheckinDone[] }> => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_readiness", { _athlete: athleteId });
      if (error) throw error;
      return data as any;
    },
  });
  if (!data) return null;
  const today = new Date().toISOString().slice(0, 10);
  const latest = latestDayAnswers(data.checkins ?? [], data.completed ?? []);
  return (
    <Card className="p-4 space-y-1" data-testid="coach-checkin-summary">
      <h3 className="font-semibold">Check-ins</h3>
      <p className="text-sm">Completed: {checkinDays(data.completed ?? [], today, 7)} of the last 7 days · {checkinDays(data.completed ?? [], today, 28)} of the last 28 days</p>
      {latest ? (
        <p className="text-sm">Latest answers ({latest.entry_date}): {latest.facts.join(" · ")}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Answers: No check-in answers in the last 7 days.</p>
      )}
      <p className="text-xs text-muted-foreground">Source: athlete-entered.</p>
    </Card>
  );
}
