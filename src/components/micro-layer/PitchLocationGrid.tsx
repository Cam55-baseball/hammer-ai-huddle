import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PitchLocationGridProps {
  value?: { row: number; col: number };
  onSelect: (loc: { row: number; col: number }) => void;
  allow5x5?: boolean;
}

export function PitchLocationGrid({ value, onSelect, allow5x5 = false }: PitchLocationGridProps) {
  const [gridSize, setGridSize] = useState<3 | 5>(3);
  const size = allow5x5 ? gridSize : 3;
  const cellSize = size === 5 ? 'h-7 w-7' : 'h-10 w-10';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Pitch Location</label>
        {allow5x5 && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant={gridSize === 3 ? 'default' : 'ghost'}
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setGridSize(3)}
            >
              3×3
            </Button>
            <Button
              type="button"
              variant={gridSize === 5 ? 'default' : 'ghost'}
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setGridSize(5)}
            >
              5×5
            </Button>
          </div>
        )}
      </div>
      <div className={cn('grid gap-1 w-fit', size === 5 ? 'grid-cols-5' : 'grid-cols-3')}>
        {Array.from({ length: size }, (_, row) =>
          Array.from({ length: size }, (_, col) => {
            const selected = value?.row === row && value?.col === col;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => onSelect({ row, col })}
                className={cn(
                  'rounded border transition-colors',
                  cellSize,
                  selected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted/30 border-border hover:bg-muted'
                )}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
