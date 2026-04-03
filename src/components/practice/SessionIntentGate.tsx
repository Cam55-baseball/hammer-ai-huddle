import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type SideMode = 'R' | 'L' | 'BOTH';

interface SessionIntentGateProps {
  module: string;
  defaultMode: SideMode;
  onSelect: (mode: SideMode) => void;
}

const hittingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right Only' },
  { value: 'BOTH', label: 'Both' },
  { value: 'L', label: 'Left Only' },
];

const pitchingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right Arm' },
  { value: 'BOTH', label: 'Both' },
  { value: 'L', label: 'Left Arm' },
];

export function SessionIntentGate({ module, defaultMode, onSelect }: SessionIntentGateProps) {
  const isHitting = module === 'hitting' || module === 'bunting';
  const options = isHitting ? hittingOptions : pitchingOptions;
  const title = isHitting ? "Today's Batting Side" : "Today's Throwing Arm";

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-medium text-center mb-1">{title}</p>
        <p className="text-xs text-muted-foreground text-center mb-3">
          Tap to set your focus for this session
        </p>
        <div className="grid grid-cols-3 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'rounded-lg border-2 py-2.5 px-2 text-center font-semibold transition-all text-xs',
                opt.value === defaultMode
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-muted/20 border-border hover:bg-muted/40 text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
