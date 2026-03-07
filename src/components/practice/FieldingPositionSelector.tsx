import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const INFIELD_POSITIONS = [
  { value: 'P', label: 'P' },
  { value: '1B', label: '1B' },
  { value: '2B', label: '2B' },
  { value: 'SS', label: 'SS' },
  { value: '3B', label: '3B' },
];

const OUTFIELD_POSITIONS = [
  { value: 'LF', label: 'LF' },
  { value: 'CF', label: 'CF' },
  { value: 'RF', label: 'RF' },
];

const CATCHER_POSITION = { value: 'C', label: 'C' };

interface FieldingPositionSelectorProps {
  value?: string;
  onChange: (position: string) => void;
  label?: string;
  required?: boolean;
}

export function FieldingPositionSelector({ value, onChange, label = 'Position', required = false }: FieldingPositionSelectorProps) {
  const btnClass = (pos: string) =>
    cn(
      'rounded-md border px-2 py-2 text-xs font-semibold transition-all',
      value === pos
        ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
        : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
    );

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="space-y-2">
        {/* Infield */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">Infield</span>
          <div className="grid grid-cols-5 gap-1.5">
            {INFIELD_POSITIONS.map(pos => (
              <button key={pos.value} type="button" onClick={() => onChange(pos.value)} className={btnClass(pos.value)}>
                {pos.label}
              </button>
            ))}
          </div>
        </div>
        {/* Outfield */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">Outfield</span>
          <div className="grid grid-cols-3 gap-1.5">
            {OUTFIELD_POSITIONS.map(pos => (
              <button key={pos.value} type="button" onClick={() => onChange(pos.value)} className={btnClass(pos.value)}>
                {pos.label}
              </button>
            ))}
          </div>
        </div>
        {/* Catcher */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">Catcher</span>
          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" onClick={() => onChange(CATCHER_POSITION.value)} className={btnClass(CATCHER_POSITION.value)}>
              {CATCHER_POSITION.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
