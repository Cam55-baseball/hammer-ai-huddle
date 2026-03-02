import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TeeDepthGridProps {
  value?: number; // 1-5
  onChange: (depth: number) => void;
  sport?: 'baseball' | 'softball';
  batterSide?: 'L' | 'R';
}

const depthPositions = [
  { value: 1, label: 'Front +2 (toward pitcher)', short: 'F+2' },
  { value: 2, label: 'Front +1', short: 'F+1' },
  { value: 3, label: 'Plate', short: 'Plate' },
  { value: 4, label: 'Back -1', short: 'B-1' },
  { value: 5, label: 'Back -2 (toward catcher)', short: 'B-2' },
];

function BaseballPlate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" className={cn('w-10 h-9', className)} aria-label="Home plate">
      <polygon
        points="20,0 40,10 40,26 20,36 0,26 0,10"
        fill="hsl(var(--background))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
      />
      {/* Inner pentagon - standard 5-sided home plate shape */}
      <polygon
        points="20,4 36,12 36,24 20,32 4,24 4,12"
        fill="hsl(var(--background))"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    </svg>
  );
}

function SoftballPlate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 38" className={cn('w-11 h-10', className)} aria-label="Home plate">
      <polygon
        points="22,0 44,11 44,27 22,38 0,27 0,11"
        fill="hsl(var(--background))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
      />
      <polygon
        points="22,5 39,14 39,24 22,33 5,24 5,14"
        fill="hsl(var(--background))"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    </svg>
  );
}

export function TeeDepthGrid({ value, onChange, sport = 'baseball', batterSide = 'R' }: TeeDepthGridProps) {
  const PlateIcon = sport === 'softball' ? SoftballPlate : BaseballPlate;
  const isLefty = batterSide === 'L';

  return (
    <div className={cn('flex flex-col items-center', isLefty && 'scale-x-[-1]')}>
      <Label className={cn('text-[9px] text-muted-foreground mb-1 block text-center', isLefty && 'scale-x-[-1]')}>
        Tee Depth <span className="text-destructive">*</span>
      </Label>
      
      {/* Toward pitcher label */}
      <p className={cn('text-[8px] text-muted-foreground mb-0.5', isLefty && 'scale-x-[-1]')}>
        ↑ Pitcher
      </p>

      <div className="flex flex-col gap-0.5 w-16 relative">
        {depthPositions.map(pos => (
          <button
            key={pos.value}
            type="button"
            onClick={() => onChange(pos.value)}
            className={cn(
              'rounded-sm border px-1 py-2 text-[9px] font-medium transition-all text-center relative',
              pos.value === 3 && 'border-2 min-h-[44px] flex items-center justify-center',
              value === pos.value
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : pos.value === 3
                  ? 'bg-amber-500/10 border-amber-400 text-amber-700 dark:text-amber-300'
                  : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
            )}
            title={pos.label}
          >
            {pos.value === 3 ? (
              <div className="flex flex-col items-center gap-0.5">
                <PlateIcon className={isLefty ? 'scale-x-[-1]' : ''} />
              </div>
            ) : (
              <span className={isLefty ? 'scale-x-[-1] inline-block' : ''}>{pos.short}</span>
            )}
          </button>
        ))}
      </div>

      {/* Toward catcher label */}
      <p className={cn('text-[8px] text-muted-foreground mt-0.5', isLefty && 'scale-x-[-1]')}>
        ↓ Catcher
      </p>
    </div>
  );
}
