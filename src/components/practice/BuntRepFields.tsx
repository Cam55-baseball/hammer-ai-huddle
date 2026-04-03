import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { useSportConfig } from '@/hooks/useSportConfig';
import type { ScoredRep } from './RepScorer';

interface BuntRepFieldsProps {
  value: Partial<ScoredRep>;
  onChange: (field: string, val: any) => void;
  sport?: string;
  batterSide?: 'L' | 'R';
  mode?: 'quick' | 'advanced';
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string; hint?: string }[];
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
        title={opt.hint}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const buntDirections = [
  { value: '3b_line', label: '3B Line' },
  { value: 'toward_3b', label: 'Toward 3B' },
  { value: 'ss', label: 'SS' },
  { value: 'pitcher', label: 'Pitcher' },
  { value: 'catcher', label: 'Catcher' },
  { value: '2b', label: '2B' },
  { value: 'toward_1b', label: 'Toward 1B' },
  { value: '1b_line', label: '1B Line' },
  { value: 'foul_1b', label: 'Foul 1B Side' },
  { value: 'foul_3b', label: 'Foul 3B Side' },
  { value: 'foul_behind', label: 'Foul Behind' },
];

const contactQualities = [
  { value: 'hard', label: 'Hard' },
  { value: 'soft', label: 'Soft' },
  { value: 'perfect', label: 'Perfect' },
];

const ballStates = [
  { value: 'down_in_brown', label: 'Down in the Brown' },
  { value: 'pop_up', label: 'Pop Up' },
];

const defenseResults = [
  { value: 'got_down', label: 'Got Down' },
  { value: 'caught_in_air', label: 'Caught in Air' },
];

const hitOrOut = [
  { value: 'hit', label: 'Hit' },
  { value: 'out', label: 'Out' },
];

const buntTypes = [
  { value: 'base_hit', label: 'Base Hit' },
  { value: 'sacrifice', label: 'Sacrifice' },
  { value: 'squeeze', label: 'Squeeze' },
];

const runnerLocations = [
  { value: '1b', label: '1B', hint: 'Best bunt result toward 1B' },
  { value: '2b', label: '2B', hint: 'Best bunt result toward 3B' },
  { value: '3b', label: '3B', hint: 'Best bunt result toward pitcher' },
];

const spinTypes = [
  { value: 'top_spin', label: 'Top Spin' },
  { value: 'back_spin', label: 'Back Spin' },
  { value: 'tail_spin', label: 'Tail Spin' },
  { value: 'cut_spin', label: 'Cut Spin' },
];


export function BuntRepFields({ value, onChange, sport, batterSide, mode = 'advanced' }: BuntRepFieldsProps) {
  const { pitchTypes } = useSportConfig();
  const v = value as any;

  return (
    <div className="space-y-3">
      {/* Execution Score */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">
          Execution Score: {v.execution_score ?? 5}
        </Label>
        <Slider
          min={1} max={10} step={1}
          value={[v.execution_score ?? 5]}
          onValueChange={([val]) => onChange('execution_score', val)}
        />
      </div>

      {/* Pitch Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Pitch Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {pitchTypes.map((pt: any) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => onChange('pitch_type', pt.id)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                v.pitch_type === pt.id
                  ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                  : 'bg-muted/30 border-border hover:bg-muted'
              )}
            >
              {pt.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange('pitch_type', 'custom')}
            className={cn(
              'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
              v.pitch_type === 'custom'
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : 'bg-muted/30 border-border hover:bg-muted'
            )}
          >
            ✏️ Custom
          </button>
        </div>
        {v.pitch_type === 'custom' && (
          <Input
            value={v.custom_pitch_type ?? ''}
            onChange={e => onChange('custom_pitch_type', e.target.value)}
            placeholder="Enter custom pitch type..."
            className="mt-2 h-8 text-xs"
          />
        )}
      </div>

      {/* Pitch Location */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Pitch Location</Label>
        <PitchLocationGrid
          value={v.pitch_location}
          onSelect={val => onChange('pitch_location', val)}
          batterSide={batterSide || 'R'}
          sport={(sport as 'baseball' | 'softball') || 'baseball'}
        />
      </div>

      {/* ABS Guess */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">ABS Guess</Label>
        <PitchLocationGrid
          value={v.abs_guess}
          onSelect={val => onChange('abs_guess', val)}
          batterSide={batterSide || 'R'}
          sport={(sport as 'baseball' | 'softball') || 'baseball'}
        />
      </div>

      {/* Contact Quality */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Contact Quality</Label>
        <SelectGrid options={contactQualities} value={v.bunt_contact_quality} onChange={val => onChange('bunt_contact_quality', val)} />
      </div>

      {/* Bunt Direction */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Bunt Direction</Label>
        <SelectGrid options={buntDirections} value={v.bunt_direction} onChange={val => onChange('bunt_direction', val)} cols={4} />
      </div>

      {/* Ball State */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Ball State</Label>
        <SelectGrid options={ballStates} value={v.bunt_ball_state} onChange={val => onChange('bunt_ball_state', val)} cols={2} />
      </div>

      {/* Defense Result */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Defense Result</Label>
        <SelectGrid options={defenseResults} value={v.bunt_defense_result} onChange={val => onChange('bunt_defense_result', val)} cols={2} />
      </div>

      {/* Hit or Out */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Hit or Out</Label>
        <SelectGrid options={hitOrOut} value={v.bunt_hit_or_out} onChange={val => onChange('bunt_hit_or_out', val)} cols={2} />
      </div>

      {/* Bunt Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Bunt Type</Label>
        <SelectGrid options={buntTypes} value={v.bunt_type} onChange={val => onChange('bunt_type', val)} />
      </div>

      {/* Runner Location */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Runner Location</Label>
        <SelectGrid options={runnerLocations} value={v.bunt_runner_location} onChange={val => onChange('bunt_runner_location', val)} />
      </div>

      {/* Spin Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Spin Type</Label>
        <SelectGrid options={spinTypes} value={v.bunt_spin_type} onChange={val => onChange('bunt_spin_type', val)} cols={4} />
      </div>

    </div>
  );
}
