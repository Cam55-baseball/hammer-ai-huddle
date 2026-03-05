import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface PlayDirectionSelectorProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
}

const directionOptions = [
  { value: 'right', label: '➡️ Right' },
  { value: 'left', label: '⬅️ Left' },
  { value: 'back', label: '⬆️ Back' },
  { value: 'in', label: '⬇️ In' },
  { value: 'straight_up', label: '⏫ Straight Up' },
];

export function PlayDirectionSelector({ value, onChange }: PlayDirectionSelectorProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">Play Direction</Label>
      <div className="grid grid-cols-5 gap-1.5">
        {directionOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange('play_direction', opt.value)}
            className={cn(
              'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
              value.play_direction === opt.value
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
