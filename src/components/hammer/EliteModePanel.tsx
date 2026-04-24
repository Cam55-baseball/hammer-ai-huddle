import { memo } from 'react';
import { useEliteLayer } from '@/hooks/useEliteLayer';
import { usePrediction } from '@/hooks/usePrediction';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATE_GRADIENT: Record<string, string> = {
  prime:   'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.4) 60%, transparent 100%)',
  ready:   'linear-gradient(90deg, hsl(152 70% 45%) 0%, hsl(152 70% 45% / 0.4) 60%, transparent 100%)',
  caution: 'linear-gradient(90deg, hsl(38 92% 50%) 0%, hsl(38 92% 50% / 0.4) 60%, transparent 100%)',
  recover: 'linear-gradient(90deg, hsl(350 80% 55%) 0%, hsl(350 80% 55% / 0.4) 60%, transparent 100%)',
};

const STATE_LABEL: Record<string, string> = {
  prime: 'prime', ready: 'ready', caution: 'caution', recover: 'recover',
};

function EliteModePanelImpl() {
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

  const showConfidence = typeof layer.confidence === 'number' && layer.confidence >= 70;
  const gradient = STATE_GRADIENT[layer.state] ?? STATE_GRADIENT.ready;

  return (
    <Card
      className="motion-safe:animate-[elite-fade-in_200ms_ease-out]"
      style={{
        borderTopWidth: '2px',
        borderTopStyle: 'solid',
        borderImageSource: gradient,
        borderImageSlice: 1,
      }}
    >
      <CardContent className="p-3 sm:p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold tracking-tight leading-snug">
            {layer.elite_message}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {windowBadge && (
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', windowBadge.tone)}>
                {windowBadge.label}
              </span>
            )}
            {showConfidence && (
              <span className="text-[10px] text-muted-foreground/80 tabular-nums whitespace-nowrap">
                Confidence: {Math.round(layer.confidence)}%
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-foreground/70 leading-snug">{layer.micro_directive}</p>
        {hasMeaningfulSignal && prediction && (
          <p
            className="text-xs text-muted-foreground leading-snug italic motion-safe:animate-[elite-fade-in_200ms_ease-out]"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            Trajectory: trending toward {STATE_LABEL[prediction.predicted_state_24h]} in next 24h
          </p>
        )}
        <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full mt-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{constraintText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export const EliteModePanel = memo(EliteModePanelImpl);
