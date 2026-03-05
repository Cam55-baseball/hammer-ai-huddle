import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface InfieldRepTypeFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  cols?: number;
}) => (
  <div className={cn('grid gap-1.5', cols === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
          value === opt.value
            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const repTypeOptions = [
  { value: 'double_play', label: '🔄 Double Play' },
  { value: 'backhand', label: '🤚 Backhand' },
  { value: 'slow_roller', label: '🐢 Slow Roller' },
  { value: 'clean_pick', label: '🧤 Clean Pick' },
];

const executionOptions = [
  { value: 'incomplete', label: '❌ Incomplete' },
  { value: 'complete', label: '✅ Complete' },
  { value: 'elite', label: '👑 Elite' },
];

export const INFIELD_POSITIONS = ['P', '1B', '2B', '3B', 'SS'];

export function InfieldRepTypeFields({ value, onChange }: InfieldRepTypeFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Rep Type</Label>
        <SelectGrid
          options={repTypeOptions}
          value={value.infield_rep_type}
          onChange={v => onChange('infield_rep_type', v)}
          cols={4}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Execution</Label>
        <SelectGrid
          options={executionOptions}
          value={value.infield_rep_execution}
          onChange={v => onChange('infield_rep_execution', v)}
        />
      </div>
    </div>
  );
}
