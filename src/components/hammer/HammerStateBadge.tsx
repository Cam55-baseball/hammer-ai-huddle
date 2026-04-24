import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useHammerState } from '@/hooks/useHammerState';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { WhyButton } from '@/components/transparency/WhyButton';

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function HammerStateBadge({ className, showLabel = true }: Props) {
  const { snapshot, color, label, tone, loading } = useHammerState();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className={cn('inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground', className)}>
        <span className="h-2 w-2 rounded-full bg-muted animate-pulse" />
        Loading
      </div>
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
        aria-label={`Hammer State: ${label}`}
      >
        <span className={cn('h-2 w-2 rounded-full', color)} />
        {showLabel && <span className={tone}>{label}</span>}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Hammer State — {label}
              <WhyButton sourceType="hammer" />
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Axis label="Arousal"   value={snapshot?.arousal_score} />
            <Axis label="Recovery"  value={snapshot?.recovery_score} />
            <Axis label="Cognitive Load" value={snapshot?.cognitive_load} invert />
            <Axis label="Dopamine Load"  value={snapshot?.dopamine_load} />
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Motor Learning Phase</span>
              <Badge variant="secondary" className="capitalize">{snapshot?.motor_state ?? 'unknown'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Updated {snapshot?.computed_at ? new Date(snapshot.computed_at).toLocaleString() : '—'}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Axis({ label, value, invert }: { label: string; value: number | null | undefined; invert?: boolean }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, Number(value)));
  const display = value == null ? '—' : Math.round(v);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}{invert ? ' (lower = better)' : ''}</span>
        <span className="font-semibold">{display}</span>
      </div>
      <Progress value={v} className="h-2" />
    </div>
  );
}
