import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useReadinessState, type ReadinessSource } from '@/hooks/useReadinessState';
import { Activity, Battery, Brain, HeartPulse, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SourceKey = 'HIE Subjective' | 'Training Load' | 'Regulation Index' | 'Focus Quiz';

interface SourceMeta {
  key: SourceKey;
  label: string;
  weight: number; // raw weight from useReadinessState
  icon: LucideIcon;
  description: string;
  emptyHint: string;
}

const SOURCES: SourceMeta[] = [
  {
    key: 'HIE Subjective',
    label: 'HIE Subjective',
    weight: 0.30,
    icon: Battery,
    description: 'Self-reported sleep, stress, and pain from your HIE check-in.',
    emptyHint: 'Run an HIE check-in to add this signal.',
  },
  {
    key: 'Training Load',
    label: 'Training Load',
    weight: 0.30,
    icon: Activity,
    description: 'Consistency, NN freshness, and CNS headroom from Hammers activity.',
    emptyHint: 'Log Hammers activity to build this signal.',
  },
  {
    key: 'Regulation Index',
    label: 'Regulation',
    weight: 0.25,
    icon: HeartPulse,
    description: 'Daily physio regulation report (HRV, breathing, recovery).',
    emptyHint: 'File a regulation report (last 36h) to add this signal.',
  },
  {
    key: 'Focus Quiz',
    label: 'Focus Quiz',
    weight: 0.15,
    icon: Brain,
    description: 'Recent vault focus quiz reflecting mental sharpness.',
    emptyHint: 'Log a focus quiz (last 36h) to add this signal.',
  },
];

const STATE_LABEL: Record<ReturnType<typeof useReadinessState>['state'], string> = {
  green: 'Ready',
  yellow: 'Caution',
  red: 'Recover',
  unknown: 'Set up',
};

const STATE_TONE: Record<ReturnType<typeof useReadinessState>['state'], string> = {
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  red: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  unknown: 'bg-muted text-muted-foreground',
};

function formatAge(iso?: string): string | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return null;
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function ReadinessBreakdownCard() {
  const r = useReadinessState();
  const sourceMap = new Map<string, ReadinessSource>(r.sources.map((s) => [s.name, s]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Readiness Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              How each signal contributes to your composite readiness score.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold leading-none">{r.score ?? '—'}</div>
            <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', STATE_TONE[r.state])}>
              {STATE_LABEL[r.state]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={r.score ?? 0} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {r.hasSignal
              ? `${r.sources.length} of 4 sources reporting · confidence ${Math.round(r.confidence * 100)}%`
              : 'Not enough fresh signals yet. Each source below shows what to log.'}
          </p>
        </div>

        <div className="space-y-2">
          {SOURCES.map((meta) => {
            const live = sourceMap.get(meta.key);
            const Icon = meta.icon;
            const present = !!live;
            return (
              <div
                key={meta.key}
                className={cn(
                  'rounded-lg border p-3',
                  present ? 'bg-card' : 'bg-muted/30 border-dashed'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', present ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          weight {Math.round(meta.weight * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {present ? (
                      <>
                        <div className="text-lg font-bold leading-none">{Math.round(live!.score)}</div>
                        {formatAge(live!.capturedAt) && (
                          <div className="text-[10px] text-muted-foreground mt-1">{formatAge(live!.capturedAt)}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Not logged</span>
                    )}
                  </div>
                </div>
                {present ? (
                  <Progress value={live!.score} className="h-1.5 mt-2" />
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">{meta.emptyHint}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground border-t pt-3">
          Composite = weighted average of fresh sources only (HIE/Regulation within 36–48h). Confidence reflects how many sources are reporting; below 30% the score is suppressed.
        </p>
      </CardContent>
    </Card>
  );
}
