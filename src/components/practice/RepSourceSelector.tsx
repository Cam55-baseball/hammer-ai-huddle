import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface RepSourceSelectorProps {
  module: string;
  value?: string;
  onChange: (source: string) => void;
}

const MODULE_SOURCES: Record<string, Array<{ value: string; label: string }>> = {
  hitting: [
    { value: 'machine_bp', label: 'Machine BP' },
    { value: 'flip', label: 'Flip' },
    { value: 'live_bp', label: 'Live BP' },
    { value: 'regular_bp', label: 'Regular BP' },
    { value: 'game', label: 'Game' },
    { value: 'tee', label: 'Tee' },
    { value: 'front_toss', label: 'Front Toss' },
    { value: 'coach_pitch', label: 'Coach Pitch' },
    { value: 'soft_toss', label: 'Soft Toss' },
    { value: 'other', label: 'Other' },
  ],
  pitching: [
    { value: 'bullpen', label: 'Bullpen' },
    { value: 'flat_ground', label: 'Flat Ground' },
    { value: 'game', label: 'Game' },
    { value: 'live_bp', label: 'Live BP' },
    { value: 'other', label: 'Other' },
  ],
  fielding: [
    { value: 'fungo', label: 'Fungo' },
    { value: 'live', label: 'Live' },
    { value: 'drill', label: 'Drill' },
    { value: 'game', label: 'Game' },
    { value: 'other', label: 'Other' },
  ],
  catching: [
    { value: 'bullpen_receive', label: 'Bullpen Receive' },
    { value: 'game', label: 'Game' },
    { value: 'drill', label: 'Drill' },
    { value: 'other', label: 'Other' },
  ],
  baserunning: [
    { value: 'drill', label: 'Drill' },
    { value: 'live', label: 'Live' },
    { value: 'game', label: 'Game' },
    { value: 'other', label: 'Other' },
  ],
};

// Rep sources that require thrower handedness selection
export const REQUIRES_THROWER_HAND = ['flip', 'live_bp', 'regular_bp', 'coach_pitch', 'soft_toss', 'front_toss', 'game'];
// Rep sources where velocity band is required
export const REQUIRES_VELOCITY = ['machine_bp'];
// Rep sources where velocity band is hidden
export const HIDES_VELOCITY = ['tee', 'front_toss', 'coach_pitch', 'soft_toss', 'flip'];
// Rep sources where pitch type is required
export const REQUIRES_PITCH_TYPE = ['live_bp', 'game', 'bullpen', 'flat_ground'];

export function RepSourceSelector({ module, value, onChange }: RepSourceSelectorProps) {
  const sources = MODULE_SOURCES[module] ?? MODULE_SOURCES.hitting;

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        Rep Source <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src) => (
          <button
            key={src.value}
            type="button"
            onClick={() => onChange(src.value)}
            className={cn(
              'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
              value === src.value
                ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
            )}
          >
            {src.label}
          </button>
        ))}
      </div>
      {!value && (
        <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>
      )}
    </div>
  );
}
