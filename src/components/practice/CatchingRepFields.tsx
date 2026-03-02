import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface CatchingRepFieldsProps {
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

export function CatchingRepFields({ value, onChange }: CatchingRepFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Pop Time Band</Label>
        <SelectGrid
          options={[
            { value: 'fast', label: 'Fast' },
            { value: 'average', label: 'Average' },
            { value: 'slow', label: 'Slow' },
          ]}
          value={value.pop_time_band}
          onChange={v => onChange('pop_time_band', v)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Transfer Grade: {value.transfer_grade ?? 50}
        </Label>
        <Slider
          min={20} max={80} step={5}
          value={[value.transfer_grade ?? 50]}
          onValueChange={([v]) => onChange('transfer_grade', v)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Block Success</Label>
        <Switch
          checked={value.block_success ?? false}
          onCheckedChange={v => onChange('block_success', v)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Throw Accuracy: {value.throw_accuracy ?? 50}
        </Label>
        <Slider
          min={20} max={80} step={5}
          value={[value.throw_accuracy ?? 50]}
          onValueChange={([v]) => onChange('throw_accuracy', v)}
        />
      </div>
    </div>
  );
}
