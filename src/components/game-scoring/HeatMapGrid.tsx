import { cn } from '@/lib/utils';

interface HeatMapGridProps {
  grid: number[][];
  label?: string;
}

export function HeatMapGrid({ grid, label }: HeatMapGridProps) {
  const max = Math.max(1, ...grid.flat());

  const getColor = (val: number) => {
    const intensity = val / max;
    if (intensity === 0) return 'bg-muted/20';
    if (intensity < 0.25) return 'bg-blue-500/20';
    if (intensity < 0.5) return 'bg-yellow-500/30';
    if (intensity < 0.75) return 'bg-orange-500/40';
    return 'bg-red-500/50';
  };

  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="grid grid-cols-5 gap-0.5 w-fit">
        {grid.map((row, ri) =>
          row.map((val, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={cn(
                'h-10 w-10 rounded-sm flex items-center justify-center text-[10px] font-medium border border-border/20',
                getColor(val),
                ri >= 1 && ri <= 3 && ci >= 1 && ci <= 3 ? 'border-green-400/30' : ''
              )}
            >
              {val > 0 ? val : ''}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
