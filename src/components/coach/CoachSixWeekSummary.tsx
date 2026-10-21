import { sixWeekPlanSummary } from '@/lib/coach/sixWeekPlanSummary';
import type { SavedCoachPlan } from '@/lib/coach/planHistory';

interface Props {
  plans: readonly SavedCoachPlan[];
  sport: string;
  today: string;
  state: 'ready' | 'loading' | 'error';
}

/** Callers supply freshly authorized, redacted snapshots from the coaching RPC. */
export function CoachSixWeekSummary({ plans, sport, today, state }: Props) {
  if (state === 'loading') return <p role="status" className="text-sm text-muted-foreground">Loading saved plans…</p>;
  if (state === 'error') return <p role="alert" className="text-sm text-destructive">Couldn't load the six-week summary.</p>;
  const summaries = sixWeekPlanSummary(plans, sport, today);
  return <section aria-label="Six-week saved plans" className="space-y-4 border-t border-border pt-4">
    <h4 className="text-sm font-semibold">Six-week saved plans</h4>
    {!summaries.length ? <p className="text-sm text-muted-foreground">No saved training plans in the last six weeks.</p> :
      <ul className="space-y-5">
        {summaries.map(summary => <li key={summary.category} className="space-y-2">
          <h5 className="text-sm font-semibold capitalize">{summary.category}</h5>
          <p className="text-xs text-muted-foreground">Saved plan days: {summary.savedPlanDays} · {summary.firstDate} to {summary.latestDate}</p>
          {summary.latestReasons.map((reason, index) => <p key={index} className="break-words text-sm">{reason.toLowerCase().startsWith('because') ? reason : `Because: ${reason}`}</p>)}
          <h6 className="text-xs font-semibold">Try in practice</h6>
          {!summary.practiceIdeas.length ? <p className="text-xs text-muted-foreground">No issue-linked practice ideas saved yet.</p> :
            <ul className="space-y-3">
              {summary.practiceIdeas.map(idea => <li key={idea.drill.slug} className="space-y-1">
                <p className="break-words text-sm font-medium">{idea.drill.name} — {idea.drill.dosage}</p>
                <p className="text-xs text-muted-foreground">Prescribed on: {idea.date}</p>
                {idea.drill.cue && <p className="break-words text-sm">{idea.drill.cue}</p>}
                {idea.reasons.map((reason, index) => <p key={index} className="break-words text-xs text-muted-foreground">{reason.toLowerCase().startsWith('because') ? reason : `Because: ${reason}`}</p>)}
              </li>)}
            </ul>}
        </li>)}
      </ul>}
  </section>;
}