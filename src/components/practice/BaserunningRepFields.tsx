import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface BaserunningRepFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
}

const SelectGrid = ({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
}) => (
  <div className="grid grid-cols-3 gap-1.5">
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

export function BaserunningRepFields({ value, onChange }: BaserunningRepFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Jump Grade: {value.jump_grade ?? 50}
        </Label>
        <Slider
          min={20} max={80} step={5}
          value={[value.jump_grade ?? 50]}
          onValueChange={([v]) => onChange('jump_grade', v)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Read Grade: {value.read_grade ?? 50}
        </Label>
        <Slider
          min={20} max={80} step={5}
          value={[value.read_grade ?? 50]}
          onValueChange={([v]) => onChange('read_grade', v)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Time to Base</Label>
        <SelectGrid
          options={[
            { value: 'fast', label: 'Fast' },
            { value: 'average', label: 'Average' },
            { value: 'slow', label: 'Slow' },
          ]}
          value={value.time_to_base_band}
          onChange={v => onChange('time_to_base_band', v)}
        />
      </div>
    </div>
  );
}
