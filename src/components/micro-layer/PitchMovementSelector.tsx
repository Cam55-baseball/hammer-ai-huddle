import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface PitchMovementSelectorProps {
  value: Direction[];
  onChange: (dirs: Direction[]) => void;
}

const ARROWS: { dir: Direction; Icon: typeof ArrowUp; gridArea: string }[] = [
  { dir: 'up', Icon: ArrowUp, gridArea: '1 / 2 / 2 / 3' },
  { dir: 'left', Icon: ArrowLeft, gridArea: '2 / 1 / 3 / 2' },
  { dir: 'right', Icon: ArrowRight, gridArea: '2 / 3 / 3 / 4' },
  { dir: 'down', Icon: ArrowDown, gridArea: '3 / 2 / 4 / 3' },
];

export function PitchMovementSelector({ value, onChange }: PitchMovementSelectorProps) {
  const orderRef = useRef<Direction[]>(value);

  // Sync orderRef when value changes externally (load, reset)
  useEffect(() => {
    orderRef.current = value;
  }, [value]);

  const toggle = useCallback(
    (dir: Direction) => {
      let next: Direction[];
      if (value.includes(dir)) {
        orderRef.current = orderRef.current.filter(d => d !== dir);
        next = value.filter(d => d !== dir);
      } else if (value.length < 2) {
        orderRef.current = [...orderRef.current, dir];
        next = [...value, dir];
      } else {
        // Replace oldest based on insertion order
        const oldest = orderRef.current[0];
        orderRef.current = [orderRef.current[1], dir];
        next = value.filter(d => d !== oldest).concat(dir);
      }
      onChange(next);
    },
    [value, onChange],
  );

  const atLimit = value.length >= 2;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        Movement Direction <span className="text-muted-foreground/60">(Optional)</span>
      </label>
      <p className="text-[10px] text-muted-foreground/50">Select up to 2</p>
      <div
        className="grid w-fit gap-1"
        style={{ gridTemplateColumns: 'repeat(3, 2.25rem)', gridTemplateRows: 'repeat(3, 2.25rem)' }}
      >
        {ARROWS.map(({ dir, Icon, gridArea }) => {
          const selected = value.includes(dir);
          return (
            <button
              key={dir}
              type="button"
              onClick={() => toggle(dir)}
              style={{ gridArea }}
              className={cn(
                'flex items-center justify-center rounded-md border transition-all',
                selected
                  ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground border-input',
                atLimit && !selected && 'opacity-40',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
