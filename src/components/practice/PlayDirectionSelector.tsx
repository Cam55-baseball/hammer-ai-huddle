import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface PlayDirectionSelectorProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
  showPlayType?: boolean;
}

const playTypeOptions = [
  { value: 'play_at_1b', label: 'Play at 1B' },
  { value: 'play_at_2b', label: 'Play at 2B' },
  { value: 'play_at_3b', label: 'Play at 3B' },
  { value: 'play_at_home', label: 'Play at Home' },
  { value: 'slow_roller', label: '🐢 Slow Roller' },
  { value: 'chopper', label: '⬆️ Chopper' },
];

const directionOptions = [
  { value: 'right', label: '➡️ Right' },
  { value: 'left', label: '⬅️ Left' },
  { value: 'back', label: '⬆️ Back' },
  { value: 'in', label: '⬇️ In' },
  { value: 'straight_up', label: '⏫ Straight Up' },
];

export function PlayDirectionSelector({ value, onChange, showPlayType = false }: PlayDirectionSelectorProps) {
  return (
    <div className="space-y-3">
      {showPlayType && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Play Type</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {playTypeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange('fielding_play_type', opt.value)}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                  value.fielding_play_type === opt.value
                    ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                    : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
