import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TeeDepthGridProps {
  value?: number; // 1-5
  onChange: (depth: number) => void;
}

const depthPositions = [
  { value: 1, label: 'Front +2', short: 'F2' },
  { value: 2, label: 'Front +1', short: 'F1' },
  { value: 3, label: 'Plate', short: '⬛' },
  { value: 4, label: 'Back -1', short: 'B1' },
  { value: 5, label: 'Back -2', short: 'B2' },
];

export function TeeDepthGrid({ value, onChange }: TeeDepthGridProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        Tee Depth <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-col gap-1 w-16">
        {depthPositions.map(pos => (
          <button
            key={pos.value}
            type="button"
            onClick={() => onChange(pos.value)}
            className={cn(
              'rounded-md border px-2 py-2.5 text-[10px] font-medium transition-all text-center relative',
              pos.value === 3 && 'border-2',
              value === pos.value
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : pos.value === 3
                  ? 'bg-amber-500/10 border-amber-400 text-amber-700'
                  : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
            )}
            title={pos.label}
          >
            {pos.short}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1 text-center w-16">Depth</p>
    </div>
  );
}
