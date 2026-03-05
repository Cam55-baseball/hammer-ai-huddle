import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface FieldingThrowFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string; title?: string }[];
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
        title={opt.title}
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

const accuracyDirectionOptions = [
  { value: 'wide_left', label: '⬅️ Wide Left' },
  { value: 'on_target', label: '🎯 On Target' },
  { value: 'dot', label: '💎 Dot', title: 'Perfect throw — ideal trajectory, on-line, no adjustment needed by receiver' },
  { value: 'wide_right', label: '➡️ Wide Right' },
];

const arrivalQualityOptions = [
  { value: 'long_hop', label: '⬇️ Long Hop' },
  { value: 'short_hop', label: '↘️ Short Hop' },
  { value: 'perfect', label: '✅ Perfect' },
  { value: 'high', label: '⬆️ High' },
];

const throwStrengthOptions = [
  { value: 'strong', label: '💪 Strong' },
  { value: 'good', label: '👍 Good' },
  { value: 'weak', label: '😓 Weak' },
];

export function FieldingThrowFields({ value, onChange }: FieldingThrowFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Accuracy Direction</Label>
        <SelectGrid
          options={accuracyDirectionOptions}
          value={value.throw_accuracy_direction}
          onChange={v => onChange('throw_accuracy_direction', v)}
          cols={4}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Ball Arrival Quality</Label>
        <SelectGrid
          options={arrivalQualityOptions}
          value={value.throw_arrival_quality}
          onChange={v => onChange('throw_arrival_quality', v)}
          cols={4}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Throw Strength</Label>
        <SelectGrid
          options={throwStrengthOptions}
          value={value.throw_strength}
          onChange={v => onChange('throw_strength', v)}
        />
      </div>
    </div>
  );
}
