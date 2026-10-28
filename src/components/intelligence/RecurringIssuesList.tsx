import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { prettyFinding, stillRecurring, type RecurringIssue } from "@/lib/wic/faultLedger/recurringIssues";

/** Stored recurring findings for a player (self, or a connected coach via the table's read rules). */
export function useRecurringIssues(athleteId?: string, sport?: string) {
  const { user } = useAuth();
  const subject = athleteId ?? user?.id;
  return useQuery({
    queryKey: ["recurring-issues", user?.id, subject, sport],
    enabled: Boolean(user?.id && subject),
    queryFn: async () => {
      let q = supabase.from("athlete_recurring_issues")
        .select("user_id,sport,skill_domain,fault_key,analysis_count,video_ids,corroborating_signal_ids,first_seen,last_seen")
        .eq("user_id", subject!);
      if (sport) q = q.eq("sport", sport);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return ((data ?? []) as RecurringIssue[]).filter((i) => stillRecurring(i));
    },
  });
}

export function RecurringIssuesList({ athleteId, sport, title = "Keeps showing up" }: { athleteId?: string; sport?: string; title?: string }) {
  const { data, isError, isPending } = useRecurringIssues(athleteId, sport);
  if (isPending) return null;
  return (
    <div aria-label="Recurring findings" className="space-y-1">
      <h3 className="font-medium">{title}</h3>
      {isError ? <p role="alert" className="text-sm text-destructive">Couldn't read recurring findings.</p>
        : !data?.length ? <p className="text-sm text-muted-foreground">Nothing has shown up twice in the last 4 weeks.</p>
        : data.map((i) => (
          <p key={`${i.sport}-${i.skill_domain}-${i.fault_key}`} className="text-sm text-muted-foreground">
            {prettyFinding(i.skill_domain)}: {prettyFinding(i.fault_key)} · seen in {i.analysis_count} saved video{i.analysis_count === 1 ? "" : "s"}
            {i.corroborating_signal_ids.length ? " and your practice or game notes" : ""} · latest {i.last_seen.slice(0, 10)}. Source: saved video analyses.
          </p>
        ))}
    </div>
  );
}
