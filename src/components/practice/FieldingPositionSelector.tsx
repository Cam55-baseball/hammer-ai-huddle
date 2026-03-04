import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const POSITIONS = [
  { value: 'P', label: 'P' },
  { value: 'C', label: 'C' },
  { value: '1B', label: '1B' },
  { value: '2B', label: '2B' },
  { value: '3B', label: '3B' },
  { value: 'SS', label: 'SS' },
  { value: 'LF', label: 'LF' },
  { value: 'CF', label: 'CF' },
  { value: 'RF', label: 'RF' },
];

interface FieldingPositionSelectorProps {
  value?: string;
  onChange: (position: string) => void;
  label?: string;
  required?: boolean;
}

export function FieldingPositionSelector({ value, onChange, label = 'Position', required = false }: FieldingPositionSelectorProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="grid grid-cols-5 gap-1.5">
        {POSITIONS.map(pos => (
          <button
            key={pos.value}
            type="button"
            onClick={() => onChange(pos.value)}
            className={cn(
              'rounded-md border px-2 py-2 text-xs font-semibold transition-all',
              value === pos.value
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
            )}
          >
            {pos.label}
          </button>
        ))}
      </div>
    </div>
  );
}
