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
  { value: 'dp_flip', label: '🔄 DP Flip' },
  { value: 'dp_throw', label: '🔄 DP Throw' },
  { value: 'dp_turn_2b', label: '🔄 DP Turn 2B' },
  { value: 'dp_unassisted_2b', label: '🔄 Unassist 2B' },
  { value: 'dp_unassisted_1b', label: '🔄 Unassist 1B' },
  { value: 'dp_unassisted_3b', label: '🔄 Unassist 3B' },
  { value: 'dp_turn_3b', label: '🔄 DP Turn 3B' },
];

const executionOptions = [
  { value: 'incomplete', label: '❌ Incomplete' },
  { value: 'complete', label: '✅ Complete' },
  { value: 'elite', label: '👑 Elite' },
];

export const INFIELD_POSITIONS = ['1B', '2B', '3B', 'SS'];

export function InfieldRepTypeFields({ value, onChange }: InfieldRepTypeFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Rep Type</Label>
        <div className={cn('grid gap-1.5 grid-cols-3')}>
          {repTypeOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('infield_rep_type', opt.value)}
              className={cn(
                'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                value.infield_rep_type === opt.value
                  ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                  : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
