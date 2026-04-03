import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type SideMode = 'R' | 'L' | 'BOTH';

interface SessionIntentGateProps {
  module: string;
  onSelect: (mode: SideMode) => void;
}

const hittingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'BOTH', label: 'Switch' },
  { value: 'L', label: 'Left' },
];

const throwingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'BOTH', label: 'Ambidextrous' },
  { value: 'L', label: 'Left' },
];

export function SessionIntentGate({ module, onSelect }: SessionIntentGateProps) {
  const isHitting = module === 'hitting' || module === 'bunting';
  const options = isHitting ? hittingOptions : throwingOptions;
  const title = isHitting ? "Today's Batting Side" : "Today's Throwing Hand";

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
                'bg-muted/20 border-border hover:bg-muted/40 text-foreground'
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
