import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PitchLocationGridProps {
  value?: { row: number; col: number };
  onSelect: (loc: { row: number; col: number }) => void;
  batterSide?: 'L' | 'R';
  sport?: 'baseball' | 'softball';
}

// Zone labels for 5x5 grid — rows 0-4, cols 0-4
// Inner zone = rows 1-3, cols 1-3 (the strike zone)
// Outer = everything else (chase/waste zones)
const ZONE_LABELS_R: string[][] = [
  ['High-In', 'High-In', 'High', 'High-Away', 'High-Away'],
  ['Up-In', 'Up-In', 'Up-Mid', 'Up-Away', 'Up-Away'],
  ['Mid-In', 'Mid-In', 'Mid-Mid', 'Mid-Away', 'Mid-Away'],
  ['Down-In', 'Down-In', 'Down-Mid', 'Down-Away', 'Down-Away'],
  ['Low-In', 'Low-In', 'Low', 'Low-Away', 'Low-Away'],
];

function mirrorCol(col: number): number {
  return 4 - col;
}

export function PitchLocationGrid({ value, onSelect, batterSide = 'R', sport = 'baseball' }: PitchLocationGridProps) {
  const isLefty = batterSide === 'L';

  const getLabel = useMemo(() => (row: number, col: number) => {
    const effectiveCol = isLefty ? mirrorCol(col) : col;
    return ZONE_LABELS_R[row]?.[effectiveCol] ?? '';
  }, [isLefty]);

  const isInnerZone = (row: number, col: number) => row >= 1 && row <= 3 && col >= 1 && col <= 3;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Pitch Location {isLefty ? '(LHH View)' : '(RHH View)'}
        </label>
        <span className="text-[10px] text-muted-foreground">{sport === 'softball' ? 'Softball Zone' : '5×5'}</span>
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-5 gap-0.5 w-fit">
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 5 }, (_, col) => {
              const displayCol = isLefty ? mirrorCol(col) : col;
              const selected = value?.row === row && value?.col === col;
              const inner = isInnerZone(row, col);
              const label = getLabel(row, col);

              return (
                <Tooltip key={`${row}-${col}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelect({ row, col })}
                      className={cn(
                        'h-9 w-9 rounded-sm border transition-all text-[9px] font-medium',
                        selected
                          ? 'bg-primary border-primary text-primary-foreground ring-2 ring-primary scale-110 z-10 relative'
                          : inner
                            ? 'bg-green-500/15 border-green-400/50 hover:bg-green-500/25 text-green-700 dark:text-green-300'
                            : 'bg-muted/20 border-border/40 hover:bg-muted/40 text-muted-foreground'
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs px-2 py-1">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </div>
      </TooltipProvider>

      {/* Home plate pentagon anchor below grid */}
      <div className="flex justify-center mt-1">
        <svg viewBox="0 0 80 50" className="w-16 h-auto opacity-60" aria-label="Home plate">
          <polygon
            points="0,0 80,0 80,28 40,50 0,28"
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="1.5"
          />
          <text x="40" y="20" textAnchor="middle" dominantBaseline="central" fontSize="7" fill="hsl(var(--muted-foreground))">
            Plate
          </text>
        </svg>
      </div>
    </div>
  );
}
