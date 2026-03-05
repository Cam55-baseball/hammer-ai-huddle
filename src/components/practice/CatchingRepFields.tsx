import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { FieldingThrowFields } from './FieldingThrowFields';
import type { ScoredRep } from './RepScorer';

interface CatchingRepFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  cols?: number;
}) => (
  <div className={cn('grid gap-1.5', cols === 3 ? 'grid-cols-3' : `grid-cols-${cols}`)}>
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

const throwBaseOptions = [
  { value: '2B', label: '2B' },
  { value: '3B', label: '3B' },
  { value: '1B', label: '1B Pickoff' },
];

export function CatchingRepFields({ value, onChange }: CatchingRepFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Pop Time (sec)</Label>
        <Input
          type="number"
          placeholder="e.g. 1.95"
          value={value.catcher_pop_time_sec ?? ''}
          onChange={e => onChange('catcher_pop_time_sec', e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="0.01"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Transfer Time (sec)</Label>
        <Input
          type="number"
          placeholder="e.g. 0.75"
          value={value.catcher_transfer_time_sec ?? ''}
          onChange={e => onChange('catcher_transfer_time_sec', e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="0.01"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Throw Base</Label>
        <SelectGrid
          options={throwBaseOptions}
          value={value.catcher_throw_base}
          onChange={v => onChange('catcher_throw_base', v)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Block Success</Label>
        <Switch
          checked={value.block_success ?? false}
          onCheckedChange={v => onChange('block_success', v)}
        />
      </div>

      {/* Throw tracking — replaces old slider */}
      <FieldingThrowFields value={value} onChange={onChange} />
    </div>
  );
}
