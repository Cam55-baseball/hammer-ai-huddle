import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HandednessGateProps {
  module: string;
  value?: 'L' | 'R';
  onChange: (side: 'L' | 'R') => void;
}

const labels: Record<string, { prompt: string; left: string; right: string }> = {
  hitting: { prompt: 'Batter Stance', left: 'Left-Handed', right: 'Right-Handed' },
  pitching: { prompt: 'Pitcher Arm', left: 'Left-Handed', right: 'Right-Handed' },
  fielding: { prompt: 'Throwing Hand', left: 'Left', right: 'Right' },
  catching: { prompt: 'Throwing Hand', left: 'Left', right: 'Right' },
  throwing: { prompt: 'Throwing Hand', left: 'Left', right: 'Right' },
  baserunning: { prompt: 'Dominant Side', left: 'Left', right: 'Right' },
  mental: { prompt: 'Handedness', left: 'Left', right: 'Right' },
};

export function HandednessGate({ module, value, onChange }: HandednessGateProps) {
  const config = labels[module] ?? labels.hitting;

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-medium text-center mb-3">{config.prompt}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['L', 'R'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onChange(side)}
              className={cn(
                'rounded-lg border-2 p-4 text-center font-semibold transition-all',
                value === side
                  ? 'bg-primary/15 border-primary text-primary scale-105'
                  : 'bg-muted/20 border-border hover:bg-muted/40 text-foreground'
              )}
            >
              <span className="text-2xl block mb-1">{side === 'L' ? '🫲' : '🫱'}</span>
              <span className="text-sm">{side === 'L' ? config.left : config.right}</span>
            </button>
          ))}
        </div>
        {!value && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Select {config.prompt.toLowerCase()} to begin logging
          </p>
        )}
      </CardContent>
    </Card>
  );
}
