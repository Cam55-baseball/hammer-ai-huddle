/**
 * "Hammers' plan for this player" — the exact final plan cards the athlete's
 * app saved, read through coach_athlete_plan. The server only answers for an
 * accepted coaching connection or authorized org staff; scouts are denied.
 * Health-bearing reason lines are omitted server-side unless the athlete's
 * separate health-sharing switch is on.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { localIso } from "@/hooks/usePitcherSchedule";
import { mapCoachOutcomes } from "@/lib/intelligence/coachOutcomes";
import { visibleCoachPlanBlocks } from '@/lib/coach/visiblePlanBlocks';
import { previousPlanDates, savedTrainingHistory, savedPlanReasons, type SavedCoachPlan, type SavedPlanBlock } from '@/lib/coach/planHistory';
import { sixWeekPlanDates } from '@/lib/coach/sixWeekPlanSummary';
import { CoachSixWeekSummary } from './CoachSixWeekSummary';
import { CoachPlanActuals } from './CoachPlanActuals';
import { isoShift } from '../../../supabase/functions/_shared/wic/schedule/timeline';
import { useAuth } from '@/hooks/useAuth';

function SavedWork({ blocks }: { blocks: SavedPlanBlock[] }) {
  return <ul className="space-y-3">
    {blocks.map((block, index) => <li key={`${block.modality}-${index}`} className="space-y-1">
      <p className="text-sm font-medium">{block.title}{block.durationMin != null ? ` · ${block.durationMin} min` : ''}</p>
      {savedPlanReasons(block).map((line, i) => <p key={i} className="text-xs text-muted-foreground">{line.trim().toLowerCase().startsWith('because') ? line : `Because: ${line}`}</p>)}
      <ul className="list-disc pl-5">
        {block.replacedByCoachRx ? <li className="text-sm">Replaced by coach workout — not missed</li> : block.drills.map((drill, i) => <li key={`${drill.name}-${i}`} className="text-sm break-words">
          {drill.name} — {drill.dosage}{drill.stage === 'full_go' ? ' (game speed)' : drill.stage === 'prep' ? ' (prep)' : drill.stage === 'log' ? ' (log)' : ''}
          {drill.cue && <p className="text-xs text-muted-foreground">{drill.cue}</p>}
        </li>)}
      </ul>
    </li>)}
  </ul>;
}

export function CoachPlanCard({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const today = localIso();
  const [ahead, setAhead] = useState(0);
  const viewDate = isoShift(today, ahead);
  const dayLabel = ahead === 0 ? 'Today' : 'Tomorrow';
  const dayToggle = <div className="flex gap-1" role="group" aria-label="Which day">
    {[0, 1].map(n => <Button key={n} type="button" size="sm" variant={ahead === n ? 'default' : 'outline'} aria-pressed={ahead === n} onClick={() => setAhead(n)}>{n === 0 ? 'Today' : 'Tomorrow'}</Button>)}
  </div>;
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const historyKey = `${athleteId}:${today}`;
  const historyOpen = historyFor === historyKey;
  const [summaryFor, setSummaryFor] = useState<string | null>(null);
  const summaryOpen = summaryFor === historyKey;
  const query = useQuery({
    queryKey: ["coach-athlete-plan", athleteId, viewDate],
    staleTime: 60_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<SavedCoachPlan> => {
      const { data, error } = await supabase.rpc("coach_athlete_plan", { _athlete: athleteId, _date: viewDate });
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
  const seasonQuery = useQuery({
    queryKey: ['coach-athlete-season', user?.id, athleteId, today],
    enabled: !!user?.id && !!query.data && query.data.state !== 'denied',
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('phase-state', { body: { athlete_id: athleteId, date: today } });
      if (error) throw error;
      return data?.live as { season: string; season_label: string; season_end_date: string | null } | undefined;
    },
  });
  const seasonLine = <div data-coach-season>
    {seasonQuery.error ? <p role="alert" className="text-xs text-destructive">Couldn't load the player's current season.</p> : seasonQuery.data && <>
      <p className="text-sm font-medium">Season: {seasonQuery.data.season_label}</p>
      {seasonQuery.data.season === 'in_season' && seasonQuery.data.season_end_date && <p className="text-xs text-muted-foreground">Season ends: {new Date(`${seasonQuery.data.season_end_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
    </>}
  </div>;
  const summaryQuery = useQuery({
    queryKey: ['coach-athlete-six-week-plans', athleteId, today, query.data?.sport],
    enabled: summaryOpen && query.data?.state === 'ok',
    staleTime: 0,
    queryFn: async () => {
      const rows: SavedCoachPlan[] = [];
      // Bound concurrency; every dated read applies the current coaching and health gate.
      const dates = sixWeekPlanDates(today);
      for (let offset = 0; offset < dates.length; offset += 6) {
        const batch = await Promise.all(dates.slice(offset, offset + 6).map(async date => {
          const { data, error } = await supabase.rpc('coach_athlete_plan', { _athlete: athleteId, _date: date });
          if (error) throw error;
          const row = data as unknown as SavedCoachPlan;
          if (!row || row.state === 'denied') throw new Error('Plan sharing unavailable');
          return row;
        }));
        rows.push(...batch);
      }
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
        {dayToggle}
        {seasonLine}
        <p className="text-sm text-muted-foreground">{ahead === 0 ? "No plan saved for today yet. It appears here after the player opens today's plan." : 'No plan saved for tomorrow yet.'}</p>
      </section>
    );
  }

  const blocks = visibleCoachPlanBlocks(plan.blocks ?? []);
  return (
    <section className="space-y-3 rounded-xl border border-border p-4" aria-label="Hammers' plan for this player">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Hammers' plan for this player</h3>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{dayLabel}{plan.sport ? ` · ${plan.sport}` : ""}</span>
          <Button variant="ghost" size="icon" aria-label="Refresh player's saved plan" title="Refresh player's saved plan" disabled={query.isFetching} onClick={()=>{void query.refetch();void seasonQuery.refetch();}}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      {dayToggle}
      {seasonLine}
      {plan.health_shared === false && (
        <p className="text-xs text-muted-foreground">Health details stay private — the player hasn't turned on health sharing.</p>
      )}
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training prescribed {ahead === 0 ? 'today' : 'tomorrow'}.</p>
      ) : (
        <SavedWork blocks={blocks} />
      )}
      {ahead === 0 && <CoachPlanActuals athleteId={athleteId} planDate={today} />}
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
      <div className="border-t border-border pt-3 space-y-3">
        <Button variant="ghost" size="sm" aria-expanded={summaryOpen} onClick={() => setSummaryFor(summaryOpen ? null : historyKey)}>
          {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}Six-week summary and practice ideas
        </Button>
        {summaryOpen && plan.sport && <CoachSixWeekSummary
          plans={summaryQuery.isFetching || summaryQuery.error ? [] : summaryQuery.data ?? []}
          sport={plan.sport} today={today} athleteId={athleteId}
          state={summaryQuery.error ? 'error' : summaryQuery.isFetching || !summaryQuery.data ? 'loading' : 'ready'}
        />}
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
