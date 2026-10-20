/**
 * "Hammers' plan for this player" — the exact final plan cards the athlete's
 * app saved, read through coach_athlete_plan. The server only answers for an
 * accepted coaching connection or authorized org staff; scouts are denied.
 * Health-bearing reason lines are omitted server-side unless the athlete's
 * separate health-sharing switch is on.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localIso } from "@/hooks/usePitcherSchedule";
import { mapCoachOutcomes } from "@/lib/intelligence/coachOutcomes";
import { visibleCoachPlanBlocks } from '@/lib/coach/visiblePlanBlocks';

interface PlanDrill { name: string; dosage: string; stage: string | null; cue: string | null }
interface PlanBlock {
  modality: string; title: string; status: string; durationMin: number | null;
  because: string[]; roadmapReason: string; drills: PlanDrill[];
}
interface CoachPlan {
  state: "ok" | "denied" | "unavailable";
  sport?: string; plan_date?: string; updated_at?: string; health_shared?: boolean;
  blocks?: PlanBlock[];
}

export function CoachPlanCard({ athleteId }: { athleteId: string }) {
  const today = localIso();
  const query = useQuery({
    queryKey: ["coach-athlete-plan", athleteId, today],
    staleTime: 60_000,
    queryFn: async (): Promise<CoachPlan> => {
      const { data, error } = await supabase.rpc("coach_athlete_plan", { _athlete: athleteId, _date: today });
      if (error) throw error;
      return data as unknown as CoachPlan;
    },
  });
  // "What worked" — recent judged outcomes, same accepted-connection gate.
  const outcomesQuery = useQuery({
    queryKey: ["coach-athlete-outcomes", athleteId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_outcomes", { _athlete: athleteId });
      if (error) throw error;
      return mapCoachOutcomes(data);
    },
  });

  if (query.isLoading) return null;
  if (query.error) {
    return <p role="alert" className="text-sm text-destructive">Couldn't load Hammers' plan for this player.</p>;
  }
  const plan = query.data;
  if (!plan || plan.state === "denied") return null; // no accepted coaching connection — show nothing
  if (plan.state === "unavailable") {
    return (
      <section className="space-y-2 rounded-xl border border-border p-4" aria-label="Hammers' plan for this player">
        <h3 className="text-sm font-semibold">Hammers' plan for this player</h3>
        <p className="text-sm text-muted-foreground">No plan saved for today yet. It appears here after the player opens today's plan.</p>
      </section>
    );
  }

  const blocks = visibleCoachPlanBlocks(plan.blocks ?? []);
  return (
    <section className="space-y-3 rounded-xl border border-border p-4" aria-label="Hammers' plan for this player">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Hammers' plan for this player</h3>
        <span className="text-xs text-muted-foreground">Today{plan.sport ? ` · ${plan.sport}` : ""}</span>
      </div>
      {plan.health_shared === false && (
        <p className="text-xs text-muted-foreground">Health details stay private — the player hasn't turned on health sharing.</p>
      )}
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training prescribed today.</p>
      ) : (
        <ul className="space-y-3">
          {blocks.map((b) => (
            <li key={`${b.modality}-${b.title}`} className="space-y-1">
              <p className="text-sm font-medium">
                {b.title}{b.durationMin != null ? ` · ${b.durationMin} min` : ""}
              </p>
              {b.because.map((line, i) => (
                <p key={i} className="text-xs text-muted-foreground">{line}</p>
              ))}
              <ul className="list-disc pl-5">
                {b.drills.map((d, i) => (
                  <li key={`${d.name}-${i}`} className="text-sm">
                    {d.name} — {d.dosage}{d.stage === "full_go" ? " (game speed)" : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {outcomesQuery.data?.state === "ok" && outcomesQuery.data.rows.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <h4 className="text-xs font-semibold">What worked lately</h4>
          <ul className="space-y-1">
            {outcomesQuery.data.rows.map((o, i) => (
              <li key={`${o.area}-${i}`} className="text-xs text-muted-foreground">
                {o.doThis} ({o.area}) — {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
