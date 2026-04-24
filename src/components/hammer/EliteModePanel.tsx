import { useEliteLayer } from '@/hooks/useEliteLayer';
import { usePrediction } from '@/hooks/usePrediction';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATE_BORDER: Record<string, string> = {
  prime: 'border-t-primary',
  ready: 'border-t-emerald-500',
  caution: 'border-t-amber-500',
  recover: 'border-t-rose-500',
};

const STATE_LABEL: Record<string, string> = {
  prime: 'prime', ready: 'ready', caution: 'caution', recover: 'recover',
};

export function EliteModePanel() {
  const { layer } = useEliteLayer();
  const { prediction, intervention, hasMeaningfulSignal } = usePrediction(layer?.state);
  if (!layer) return null;

  // Priority-4+ intervention overrides the constraint chip
  const overrideConstraint = intervention && intervention.priority >= 4;
  const constraintText = overrideConstraint ? intervention.directive : layer.constraint_text;

  // Window badge — only when confidence ≥ 70 AND state mismatch
  let windowBadge: { label: string; tone: string } | null = null;
  if (prediction && prediction.confidence_24h >= 70 && layer.state !== prediction.predicted_state_24h) {
    if (prediction.predicted_state_24h === 'prime') {
      windowBadge = { label: 'Window Opening', tone: 'text-emerald-600 bg-emerald-500/10' };
    } else if (prediction.predicted_state_24h === 'recover') {
      windowBadge = { label: 'Window Closing', tone: 'text-amber-600 bg-amber-500/10' };
    }
  }

  return (
    <Card
      className={cn(
        'border-t-2 animate-in fade-in duration-200',
        STATE_BORDER[layer.state] ?? 'border-t-border'
      )}
    >
      <CardContent className="p-3 sm:p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{layer.elite_message}</p>
          {windowBadge && (
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', windowBadge.tone)}>
              {windowBadge.label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-tight">{layer.micro_directive}</p>
        {hasMeaningfulSignal && prediction && (
          <p className="text-xs text-muted-foreground leading-tight italic">
            Trajectory: trending toward {STATE_LABEL[prediction.predicted_state_24h]} in next 24h
          </p>
        )}
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full mt-1">
          <AlertCircle className="h-3 w-3" />
          {constraintText}
        </div>
      </CardContent>
    </Card>
  );
}
