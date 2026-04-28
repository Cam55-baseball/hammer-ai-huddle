import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { useReadinessState } from '@/hooks/useReadinessState';
import { cn } from '@/lib/utils';
import { Battery } from 'lucide-react';

interface Props {
  variant?: 'compact' | 'expanded';
  className?: string;
}

const TONES = {
  green:   { dot: 'bg-emerald-500', text: 'text-emerald-500', label: 'Ready' },
  yellow:  { dot: 'bg-amber-500',   text: 'text-amber-500',   label: 'Caution' },
  red:     { dot: 'bg-rose-500',    text: 'text-rose-500',    label: 'Recover' },
  unknown: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', label: 'Set up' },
};

export function ReadinessChip({ variant = 'compact', className }: Props) {
  const r = useReadinessState();
  const [open, setOpen] = useState(false);
  const tone = TONES[r.state];
  const displayScore = r.hasSignal ? r.score : null;

  if (variant === 'expanded') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn('w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent', className)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={cn('h-4 w-4', tone.text)} />
              <span className="text-sm font-medium">Readiness · {tone.label}</span>
            </div>
            <span className={cn('text-lg font-bold', tone.text)}>
              {displayScore ?? '—'}
            </span>
          </div>
          <Progress value={displayScore ?? 0} className="mt-2 h-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">
            {r.hasSignal
              ? `${r.sources.length} source${r.sources.length === 1 ? '' : 's'} · confidence ${Math.round(r.confidence * 100)}%`
              : 'Log a focus quiz, regulation report, or HIE check to seed readiness.'}
          </p>
        </button>
        <SourceSheet open={open} onOpenChange={setOpen} state={r} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:bg-accent',
          className
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', tone.dot)} />
        <span className={tone.text}>
          {r.hasSignal ? `Readiness ${displayScore}` : 'Readiness · Set up'}
        </span>
      </button>
      <SourceSheet open={open} onOpenChange={setOpen} state={r} />
    </>
  );
}

function SourceSheet({ open, onOpenChange, state }: { open: boolean; onOpenChange: (b: boolean) => void; state: ReturnType<typeof useReadinessState> }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Readiness Breakdown</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Composite</span>
              <span className="text-2xl font-bold">{state.score ?? '—'}</span>
            </div>
            <Progress value={state.score ?? 0} className="mt-2 h-2" />
            {!state.hasSignal && (
              <p className="mt-2 text-xs text-muted-foreground">
                Not enough fresh signals yet. Log an HIE check, regulation report, or focus quiz in the last 36–48h.
              </p>
            )}
          </div>
          {state.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source signals yet — log a session to seed readiness.</p>
          ) : (
            state.sources.map((s) => (
              <div key={s.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">weight {Math.round(s.weight * 100)}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <Progress value={s.score} className="h-1.5 flex-1" />
                  <span className="ml-3 text-sm font-semibold">{Math.round(s.score)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
