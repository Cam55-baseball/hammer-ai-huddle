/**
 * "Hammers' plan for this player" — the exact final plan cards the athlete's
 * app saved, read through coach_athlete_plan. The server only answers for an
 * accepted coaching connection or authorized org staff; scouts are denied.
 * Health-bearing reason lines are omitted server-side unless the athlete's
 * separate health-sharing switch is on.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { localIso } from "@/hooks/usePitcherSchedule";
import { mapCoachOutcomes } from "@/lib/intelligence/coachOutcomes";
import { visibleCoachPlanBlocks } from '@/lib/coach/visiblePlanBlocks';
import { previousPlanDates, savedTrainingHistory, savedPlanReasons, type SavedCoachPlan, type SavedPlanBlock } from '@/lib/coach/planHistory';

function SavedWork({ blocks }: { blocks: SavedPlanBlock[] }) {
  return <ul className="space-y-3">
    {blocks.map((block, index) => <li key={`${block.modality}-${index}`} className="space-y-1">
      <p className="text-sm font-medium">{block.title}{block.durationMin != null ? ` · ${block.durationMin} min` : ''}</p>
      {savedPlanReasons(block).map((line, i) => <p key={i} className="text-xs text-muted-foreground">{line.trim().toLowerCase().startsWith('because') ? line : `Because: ${line}`}</p>)}
      <ul className="list-disc pl-5">
        {block.drills.map((drill, i) => <li key={`${drill.name}-${i}`} className="text-sm break-words">
          {drill.name} — {drill.dosage}{drill.stage === 'full_go' ? ' (game speed)' : drill.stage === 'prep' ? ' (prep)' : drill.stage === 'log' ? ' (log)' : ''}
          {drill.cue && <p className="text-xs text-muted-foreground">{drill.cue}</p>}
        </li>)}
      </ul>
    </li>)}
  </ul>;
}

export function CoachPlanCard({ athleteId }: { athleteId: string }) {
  const today = localIso();
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const historyKey = `${athleteId}:${today}`;
  const historyOpen = historyFor === historyKey;
  const query = useQuery({
    queryKey: ["coach-athlete-plan", athleteId, today],
    staleTime: 60_000,
    queryFn: async (): Promise<SavedCoachPlan> => {
      const { data, error } = await supabase.rpc("coach_athlete_plan", { _athlete: athleteId, _date: today });
      if (error) throw error;
      return data as unknown as SavedCoachPlan;
    },
  });
  const historyQuery = useQuery({
    queryKey: ['coach-athlete-plan-history', athleteId, today, query.data?.sport],
    enabled: historyOpen && query.data?.state === 'ok',
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await Promise.all(previousPlanDates(today).map(async date => {
        const { data, error } = await supabase.rpc('coach_athlete_plan', { _athlete: athleteId, _date: date });
        if (error) throw error;
        const row = data as unknown as SavedCoachPlan;
        if (!row || row.state === 'denied') throw new Error('Plan sharing unavailable');
        return row;
      }));
      return savedTrainingHistory(rows, query.data?.sport);
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
        <SavedWork blocks={blocks} />
      )}
      <div className="border-t border-border pt-3 space-y-3">
        <Button variant="ghost" size="sm" aria-expanded={historyOpen} onClick={() => setHistoryFor(historyOpen ? null : historyKey)}>
          {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}Saved work — last 7 days
        </Button>
        {historyOpen && (historyQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading saved work…</p>
          : historyQuery.error ? <p role="alert" className="text-xs text-destructive">Couldn't load saved work.</p>
          : !historyQuery.data?.length ? <p className="text-xs text-muted-foreground">No earlier plans saved in the last 7 days.</p>
          : historyQuery.data.map(day => <div key={day.plan_date} className="space-y-2 border-t border-border pt-2">
            <h4 className="text-xs font-semibold">Saved plan · {day.plan_date}</h4>
            {day.blocks.length ? <SavedWork blocks={day.blocks} /> : <p className="text-xs text-muted-foreground">No training prescribed in this saved plan.</p>}
          </div>))}
      </div>
      {outcomesQuery.error && <p role="alert" className="text-xs text-destructive">Couldn't load what worked lately.</p>}
      {outcomesQuery.data?.state === 'ok' && outcomesQuery.data.rows.length === 0 && <div className="border-t border-border pt-3 space-y-1">
        <h4 className="text-xs font-semibold">What worked lately</h4>
        <p className="text-xs text-muted-foreground">Need more data.</p>
      </div>}
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
