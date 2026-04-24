import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useSystemHealth, type SystemHealthRow } from '@/hooks/useSystemHealth';
import { cn } from '@/lib/utils';

const COMPONENT_LABELS: Record<string, string> = {
  heartbeat: 'Heartbeat',
  sentinel: 'Sentinel',
  adversarial: 'Adversarial',
  regression: 'Regression',
  prediction: 'Prediction',
  advisory: 'Advisory',
};

function colorFor(score: number | null) {
  if (score === null) return { bg: 'bg-muted text-muted-foreground border-border', label: 'No data yet', Icon: Shield };
  if (score >= 90) return { bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', label: `${score}/100`, Icon: ShieldCheck };
  if (score >= 75) return { bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', label: `${score}/100`, Icon: Shield };
  return { bg: 'bg-destructive/15 text-destructive border-destructive/30', label: `${score}/100`, Icon: ShieldAlert };
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <div className="h-6 w-20 text-[10px] text-muted-foreground">—</div>;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 80},${24 - ((v - min) / range) * 22}`)
    .join(' ');
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SystemIntegrityBadge() {
  const { score, breakdown, history, loading } = useSystemHealth();
  const [open, setOpen] = useState(false);

  if (loading) return <Skeleton className="h-9 w-48" />;

  const c = colorFor(score);
  const Icon = c.Icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80',
          c.bg,
        )}
      >
        <Icon className="h-4 w-4" />
        <span>System Integrity: {c.label}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>System Integrity Breakdown</DialogTitle>
            <DialogDescription>
              {score === null
                ? 'No health data has been computed yet. The first run will populate this view.'
                : `Composite score ${score}/100 from 6 engine layers.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {Object.keys(COMPONENT_LABELS).map((key) => {
              const val = breakdown?.[key as keyof typeof breakdown] as number | null | undefined;
              const sample = breakdown?.samples?.[key];
              const seriesValues = history
                .map((h: SystemHealthRow) => {
                  const b = h.breakdown?.[key as keyof typeof h.breakdown];
                  return typeof b === 'number' ? b : null;
                })
                .filter((v): v is number => v !== null);

              return (
                <div key={key} className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{COMPONENT_LABELS[key]}</span>
                    <span className="text-xs text-muted-foreground">
                      {val === null || val === undefined
                        ? 'No data'
                        : `${Math.round(val * 100)}%${sample !== undefined ? ` · n=${sample}` : ''}`}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <Sparkline values={seriesValues} />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
