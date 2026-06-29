import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoadmapStep } from '@/lib/hittingCausalChains';
import { HITTING_FELT_ORDER, HITTING_PHASES, type HittingPhaseId } from '@/lib/hittingPhases';

interface Props {
  roadmap: RoadmapStep[];
  className?: string;
}

const STEP_COLORS: Record<RoadmapStep['key'], string> = {
  feel: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  iso: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  constraint: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  transfer: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

// Camera/coach order is the canonical phase ID order (P1→P2→P3→P4).
const SEEN_ORDER: readonly HittingPhaseId[] = ['P1', 'P2', 'P3', 'P4'] as const;

function renderOrder(order: readonly HittingPhaseId[]): string {
  return order
    .map((p) => (HITTING_PHASES[p].involuntary ? `${p}*` : p))
    .join(' → ');
}

export function HittingRoadmapLadder({ roadmap, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your 4-Step Roadmap</CardTitle>
        <p className="text-xs text-muted-foreground">Feel &rarr; Isolate &rarr; Constrain &rarr; Transfer</p>
        {/* v2 Arakawa felt-order legend. Camera sees P1→P2→P3→P4; hitter feels P1→P2→P4→P3-emerges. */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">Seen: {renderOrder(SEEN_ORDER)}</Badge>
          <Badge
            variant="outline"
            className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300"
            title="Hitter's felt order. P3 (stride / heel plant) is involuntary — it emerges from organized P1+P2+P4. Do not consciously cue P3."
          >
            Felt: {renderOrder(HITTING_FELT_ORDER)}
          </Badge>
          <span className="text-[10px] italic">*involuntary — do not cue</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {roadmap.map((step) => (
          <div key={step.step} className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STEP_COLORS[step.key]}>
                {step.step}. {step.label}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">drill: {step.drillId}</span>
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">{step.athleteCue}</div>
            <div className="mt-1 text-xs text-muted-foreground">{step.intent}</div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Coach&apos;s note
              </summary>
              <p className="mt-1 text-xs italic text-muted-foreground">{step.coachNote}</p>
            </details>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
