import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface ThrowingRepFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
  mode: 'quick' | 'advanced';
  sport: string;
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

const baseballDistanceBands = [
  { value: '60', label: '60 ft' },
  { value: '90', label: '90 ft' },
  { value: '120', label: '120 ft' },
  { value: '150', label: '150 ft' },
  { value: '180', label: '180 ft' },
  { value: '200+', label: '200+ ft' },
];

const softballDistanceBands = [
  { value: '40', label: '40 ft' },
  { value: '60', label: '60 ft' },
  { value: '80', label: '80 ft' },
  { value: '100', label: '100 ft' },
  { value: '120', label: '120 ft' },
  { value: '150+', label: '150+ ft' },
];

const accuracyOptions = [
  { value: 'on_target', label: '🎯 On Target' },
  { value: 'off_target', label: '↗️ Off Target' },
  { value: 'wild', label: '❌ Wild' },
];

const armFeelOptions = [
  { value: 'fresh', label: '💪 Fresh' },
  { value: 'normal', label: '👍 Normal' },
  { value: 'fatigued', label: '😓 Fatigued' },
];

const spinQualityOptions = [
  { value: 'carry', label: 'Carry' },
  { value: 'tail', label: 'Tail' },
  { value: 'cut', label: 'Cut' },
  { value: 'sink', label: 'Sink' },
  { value: 'neutral', label: 'Neutral' },
];

const selfCatchQualityOptions = [
  { value: 'bad', label: '❌ Bad' },
  { value: 'decent', label: '👍 Decent' },
  { value: 'good', label: '✅ Good' },
];

const effortLevelOptions = [
  { value: 'low', label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high', label: '🔴 High' },
];

export function ThrowingRepFields({ value, onChange, mode, sport }: ThrowingRepFieldsProps) {
  const distanceBands = sport === 'softball' ? softballDistanceBands : baseballDistanceBands;

  return (
    <div className="space-y-3">
      {/* Quick fields */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Throw Distance</Label>
        <SelectGrid
          options={distanceBands}
          value={value.throw_distance_band}
          onChange={v => onChange('throw_distance_band', v)}
          cols={3}
        />
      </div>

      {/* Exact Throw Distance (optional override) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Exact Throw Distance (Feet)</Label>
        <Input
          type="number"
          placeholder="Optional — overrides band"
          value={value.exact_throw_distance_ft ?? ''}
          onChange={e => onChange('exact_throw_distance_ft', e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="any"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Accuracy</Label>
        <SelectGrid
          options={accuracyOptions}
          value={value.throw_accuracy_tag}
          onChange={v => onChange('throw_accuracy_tag', v)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Arm Feel</Label>
        <SelectGrid
          options={armFeelOptions}
          value={value.arm_feel}
          onChange={v => onChange('arm_feel', v)}
        />
      </div>

      {/* Self-Catch Quality (Required) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Self-Catch Quality <span className="text-destructive">*</span>
        </Label>
        <SelectGrid
          options={selfCatchQualityOptions}
          value={value.self_catch_quality}
          onChange={v => onChange('self_catch_quality', v)}
        />
      </div>

      {/* Effort Level (Required) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Effort Level <span className="text-destructive">*</span>
        </Label>
        <SelectGrid
          options={effortLevelOptions}
          value={value.effort_level}
          onChange={v => onChange('effort_level', v)}
        />
      </div>

      {/* Exact Velocity (optional override) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Exact Velocity (MPH)</Label>
        <Input
          type="number"
          placeholder="Optional — overrides velocity band"
          value={value.exact_velocity_mph ?? ''}
          onChange={e => onChange('exact_velocity_mph', e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-xs"
          min={0}
          step="any"
        />
      </div>

      {/* Advanced fields */}
      {mode === 'advanced' && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Carry Grade: {value.carry_grade ?? 50}
            </Label>
            <Slider
              min={20} max={80} step={5}
              value={[value.carry_grade ?? 50]}
              onValueChange={([v]) => onChange('carry_grade', v)}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Spin Quality</Label>
            <SelectGrid
              options={spinQualityOptions}
              value={value.throw_spin_quality}
              onChange={v => onChange('throw_spin_quality', v)}
              cols={5}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Footwork Grade: {value.footwork_grade ?? 50}
            </Label>
            <Slider
              min={20} max={80} step={5}
              value={[value.footwork_grade ?? 50]}
              onValueChange={([v]) => onChange('footwork_grade', v)}
            />
          </div>
        </>
      )}
    </div>
  );
}
