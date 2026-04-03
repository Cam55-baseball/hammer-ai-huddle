import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HandednessGateProps {
  module: string;
  onSelect: (side: 'L' | 'R' | 'S') => void;
  isSaving?: boolean;
}

const configs: Record<string, { title: string; options: { value: 'L' | 'R' | 'S'; label: string; emoji: string }[] }> = {
  hitting: {
    title: 'Set Your Batting Stance',
    options: [
      { value: 'R', label: 'Right-Handed', emoji: '🫱' },
      { value: 'L', label: 'Left-Handed', emoji: '🫲' },
      { value: 'S', label: 'Switch Hitter', emoji: '🔄' },
    ],
  },
  pitching: {
    title: 'Set Your Throwing Hand',
    options: [
      { value: 'R', label: 'Right-Handed', emoji: '🫱' },
      { value: 'L', label: 'Left-Handed', emoji: '🫲' },
      { value: 'S', label: 'Ambidextrous', emoji: '🔄' },
    ],
  },
  fielding: {
    title: 'Set Your Throwing Hand',
    options: [
      { value: 'R', label: 'Right', emoji: '🫱' },
      { value: 'L', label: 'Left', emoji: '🫲' },
    ],
  },
  throwing: {
    title: 'Set Your Throwing Hand',
    options: [
      { value: 'R', label: 'Right', emoji: '🫱' },
      { value: 'L', label: 'Left', emoji: '🫲' },
    ],
  },
};

export function HandednessGate({ module, onSelect, isSaving }: HandednessGateProps) {
  const config = configs[module] ?? configs.hitting;

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-medium text-center mb-1">{config.title}</p>
        <p className="text-xs text-muted-foreground text-center mb-3">
          Saved to your profile — you won't be asked again
        </p>
        <div className={cn('grid gap-3', config.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {config.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isSaving}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'rounded-lg border-2 p-3 text-center font-semibold transition-all',
                'bg-muted/20 border-border hover:bg-muted/40 text-foreground',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span className="text-xl block mb-1">{opt.emoji}</span>
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
