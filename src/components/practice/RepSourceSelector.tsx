import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface RepSourceSelectorProps {
  module: string;
  value?: string;
  onChange: (source: string) => void;
}

interface SourceItem {
  value: string;
  label: string;
  desc?: string;
}

interface SourceGroup {
  group: string;
  items: SourceItem[];
}

const HITTING_SOURCES: SourceGroup[] = [
  {
    group: 'Machine',
    items: [
      { value: 'machine_bp', label: 'Machine BP', desc: 'Pitching machine at set speed' },
      { value: 'tee', label: 'Tee', desc: 'Stationary ball on tee' },
    ],
  },
  {
    group: 'Thrown',
    items: [
      { value: 'front_toss', label: 'Front Toss', desc: 'Underhand from short distance' },
      { value: 'soft_toss', label: 'Soft Toss', desc: 'Side-angle underhand' },
      { value: 'flip', label: 'Flip', desc: 'Quick toss from close range' },
      { value: 'coach_pitch', label: 'Coach Pitch', desc: 'Coach throws overhand' },
    ],
  },
  {
    group: 'Live',
    items: [
      { value: 'live_bp', label: 'Live BP', desc: 'Pitcher from mound/circle' },
      { value: 'regular_bp', label: 'Regular BP', desc: 'Standard batting practice' },
      { value: 'game', label: 'Game', desc: 'In-game at-bats' },
    ],
  },
  {
    group: 'Other',
    items: [
      { value: 'other', label: 'Other', desc: 'Custom rep source' },
    ],
  },
];

const PITCHING_SOURCES: SourceGroup[] = [
  {
    group: 'Mound',
    items: [
      { value: 'bullpen', label: 'Bullpen', desc: 'Full mound/circle work' },
      { value: 'flat_ground', label: 'Flat Ground', desc: 'Level surface throwing' },
    ],
  },
  {
    group: 'Live',
    items: [
      { value: 'live_bp', label: 'Live BP', desc: 'Pitching to live batters' },
      { value: 'game', label: 'Game', desc: 'In-game pitching' },
    ],
  },
  {
    group: 'Other',
    items: [
      { value: 'other', label: 'Other', desc: 'Custom rep source' },
    ],
  },
];

const FLAT_SOURCES: Record<string, SourceItem[]> = {
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
// Rep sources where pitch type is required (hitting + pitching)
export const REQUIRES_PITCH_TYPE = ['machine_bp', 'live_bp', 'regular_bp', 'game', 'coach_pitch', 'front_toss', 'bullpen', 'flat_ground'];
// Rep sources where pitch type is hidden entirely
export const HIDES_PITCH_TYPE = ['tee', 'soft_toss'];
// Rep sources where pitch distance is hidden
export const HIDES_PITCH_DISTANCE = ['tee', 'soft_toss'];

function GroupedSelector({ groups, value, onChange }: { groups: SourceGroup[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <div key={g.group}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 block">
            {g.group}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(src => (
              <button
                key={src.value}
                type="button"
                onClick={() => onChange(src.value)}
                title={src.desc}
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
        </div>
      ))}
    </div>
  );
}

export function RepSourceSelector({ module, value, onChange }: RepSourceSelectorProps) {
  if (module === 'hitting') {
    return (
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Rep Source <span className="text-destructive">*</span>
        </Label>
        <GroupedSelector groups={HITTING_SOURCES} value={value} onChange={onChange} />
        {!value && <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>}
      </div>
    );
  }

  if (module === 'pitching') {
    return (
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Rep Source <span className="text-destructive">*</span>
        </Label>
        <GroupedSelector groups={PITCHING_SOURCES} value={value} onChange={onChange} />
        {!value && <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>}
      </div>
    );
  }

  // Flat list for other modules
  const sources = FLAT_SOURCES[module] ?? FLAT_SOURCES.fielding;
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        Rep Source <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {sources.map(src => (
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
      {!value && <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>}
    </div>
  );
}
