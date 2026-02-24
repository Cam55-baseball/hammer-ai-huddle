import { cn } from '@/lib/utils';

interface PitchLocationGridProps {
  value?: { row: number; col: number };
  onSelect: (loc: { row: number; col: number }) => void;
}

export function PitchLocationGrid({ value, onSelect }: PitchLocationGridProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Pitch Location</label>
      <div className="grid grid-cols-3 gap-1 w-fit">
        {[0, 1, 2].map(row =>
          [0, 1, 2].map(col => {
            const selected = value?.row === row && value?.col === col;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => onSelect({ row, col })}
                className={cn(
                  'h-10 w-10 rounded border transition-colors',
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
