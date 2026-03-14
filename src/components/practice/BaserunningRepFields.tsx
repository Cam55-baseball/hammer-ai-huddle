import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AITextBoxField } from './AITextBoxField';
import type { ScoredRep } from './RepScorer';

interface BaserunningRepFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
  sport?: string;
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  cols?: number;
}) => (
  <div className={cn('grid gap-1.5', `grid-cols-${cols}`)}>
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

const baseballDrills = [
  { value: 'home_to_1st', label: 'Home→1st' },
  { value: '1st_to_3rd', label: '1st→3rd' },
  { value: '1st_to_home', label: '1st→Home' },
  { value: '2nd_to_home', label: '2nd→Home' },
  { value: 'steal_2nd', label: 'Steal 2nd' },
  { value: 'steal_3rd', label: 'Steal 3rd' },
  { value: 'delayed_steal', label: 'Delayed Steal' },
  { value: 'hit_and_run', label: 'Hit & Run' },
  { value: 'tag_up', label: 'Tag Up' },
  { value: 'lead_work', label: 'Lead Work' },
  { value: 'custom', label: '✏️ Custom' },
];

const softballDrills = [
  { value: 'home_to_1st', label: 'Home→1st' },
  { value: '1st_to_3rd', label: '1st→3rd' },
  { value: '1st_to_home', label: '1st→Home' },
  { value: '2nd_to_home', label: '2nd→Home' },
  { value: 'steal_2nd', label: 'Steal 2nd' },
  { value: 'steal_3rd', label: 'Steal 3rd' },
  { value: 'steal_home', label: 'Steal Home' },
  { value: 'slap_and_run', label: 'Slap & Run' },
  { value: 'bunt_and_run', label: 'Bunt & Run' },
  { value: 'tag_up', label: 'Tag Up' },
  { value: 'leadoff', label: 'Lead-off' },
  { value: 'custom', label: '✏️ Custom' },
];

const goalOptions = [
  { value: 'safe', label: '✅ Safe' },
  { value: 'practice_read', label: '👀 Practice Read' },
  { value: 'work_on_jump', label: '⚡ Jump Work' },
  { value: 'speed_work', label: '🏃 Speed Work' },
  { value: 'situational', label: '🎯 Situational' },
];

export function BaserunningRepFields({ value, onChange, sport }: BaserunningRepFieldsProps) {
  const drills = sport === 'softball' ? softballDrills : baseballDrills;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Drill Type</Label>
        <SelectGrid
          options={drills}
          value={value.drill_type}
          onChange={v => onChange('drill_type', v)}
        />
      </div>

      {/* AI Drill Type Description — required when drill_type is custom */}
      {value.drill_type === 'custom' && (
        <AITextBoxField
          label="AI Drill Type Description"
          value={value.ai_baserunning_drill_description ?? ''}
          onChange={v => onChange('ai_baserunning_drill_description', v)}
          minChars={15}
          required
          placeholder="Describe the custom drill for AI tracking (min 15 characters)..."
        />
      )}

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Goal of Rep</Label>
        <SelectGrid
          options={goalOptions}
          value={value.baserunning_goal}
          onChange={v => onChange('baserunning_goal', v)}
          cols={3}
        />
      </div>

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

      {/* Exact Time to Base (optional override) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Exact Time to Base (Seconds)</Label>
        <Input
          type="number"
          placeholder="Optional — overrides time band"
          value={value.exact_time_to_base_sec ?? ''}
          onChange={e => onChange('exact_time_to_base_sec', e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="any"
        />
      </div>

      {/* Exact Steps to Base (optional) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Exact Steps to Base</Label>
        <Input
          type="number"
          placeholder="Optional integer"
          value={value.exact_steps_to_base ?? ''}
          onChange={e => onChange('exact_steps_to_base', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="1"
        />
      </div>
    </div>
  );
}
