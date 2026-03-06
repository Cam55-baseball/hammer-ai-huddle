import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface RepSourceSelectorProps {
  module: string;
  sessionType?: string;
  value?: string;
  onChange: (source: string) => void;
  customSource?: string;
  onCustomSourceChange?: (v: string) => void;
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
      { value: 'flat_ground_vs_hitter', label: 'Flat Ground vs Hitter', desc: 'Flat ground with live hitter' },
      { value: 'bullpen_vs_hitter', label: 'Bullpen vs Hitter', desc: 'Bullpen with live hitter' },
    ],
  },
  {
    group: 'Live',
    items: [
      { value: 'live_bp', label: 'Live BP', desc: 'Pitching to live batters' },
      { value: 'sim_game', label: 'Simulated Game', desc: 'Simulated game reps' },
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

const THROWING_SOURCES: SourceGroup[] = [
  {
    group: 'Long Toss',
    items: [
      { value: 'long_toss', label: 'Long Toss', desc: 'Progressive distance throws' },
    ],
  },
  {
    group: 'Flat Ground',
    items: [
      { value: 'flat_ground_throw', label: 'Flat Ground', desc: 'Mechanical work on level surface' },
    ],
  },
  {
    group: 'PFP / Position',
    items: [
      { value: 'pfp', label: 'PFP', desc: 'Pitcher fielding practice' },
      { value: 'position_work', label: 'Position Work', desc: 'Position-specific throws' },
    ],
  },
  {
    group: 'Live',
    items: [
      { value: 'live', label: 'Live', desc: 'Live throwing situations' },
      { value: 'game', label: 'Game', desc: 'In-game throws' },
    ],
  },
  {
    group: 'Other',
    items: [
      { value: 'other', label: 'Other', desc: 'Custom throw source' },
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
    { value: 'back_pick_1b', label: 'Back Pick → 1B' },
    { value: 'back_pick_3b', label: 'Back Pick → 3B' },
    { value: 'throw_down_2b', label: 'Throw Down → 2B' },
    { value: 'throw_down_3b', label: 'Throw Down → 3B' },
    { value: 'pop_fly_right', label: 'Pop Fly Right' },
    { value: 'pop_fly_left', label: 'Pop Fly Left' },
    { value: 'pop_fly_back', label: 'Pop Fly Back' },
    { value: 'pop_fly_pitcher', label: 'Pop Fly → Pitcher' },
    { value: 'bunt_1b', label: 'Bunt → 1B' },
    { value: 'bunt_3b', label: 'Bunt → 3B' },
    { value: 'bunt_pitcher', label: 'Bunt → Pitcher' },
    { value: 'tag_play_home', label: 'Tag Play at Home' },
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
export const REQUIRES_THROWER_HAND = ['flip', 'live_bp', 'regular_bp', 'coach_pitch', 'soft_toss', 'front_toss'];
// Rep sources where velocity band is required
export const REQUIRES_VELOCITY = ['machine_bp'];
// Rep sources where velocity band is hidden
export const HIDES_VELOCITY = ['tee', 'front_toss', 'coach_pitch', 'soft_toss', 'flip'];
// Rep sources where pitch type is required (hitting + pitching)
export const REQUIRES_PITCH_TYPE = ['machine_bp', 'live_bp', 'regular_bp', 'coach_pitch', 'front_toss', 'bullpen', 'flat_ground', 'flat_ground_vs_hitter'];
// Rep sources where pitch type is hidden entirely
export const HIDES_PITCH_TYPE = ['tee', 'soft_toss'];
// Rep sources where pitch distance is hidden
export const HIDES_PITCH_DISTANCE = ['tee', 'soft_toss'];

// ── Session-type → valid source filtering ──────────────────────────

const VALID_HITTING_SOURCES: Record<string, string[]> = {
  solo_work: ['tee', 'soft_toss', 'machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp'],
  team_session: ['machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp'],
  lesson: ['tee', 'soft_toss', 'front_toss', 'flip', 'coach_pitch', 'machine_bp', 'live_bp', 'regular_bp'],
  live_abs: ['machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp'],
};

const VALID_PITCHING_SOURCES: Record<string, string[]> = {
  solo_work: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  team_session: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  lesson: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
  live_abs: ['bullpen', 'flat_ground', 'flat_ground_vs_hitter', 'live_bp'],
};

const VALID_THROWING_SOURCES: Record<string, string[]> = {
  solo_work: ['long_toss', 'flat_ground_throw'],
  team_session: ['long_toss', 'flat_ground_throw', 'pfp', 'position_work', 'live'],
  lesson: ['long_toss', 'flat_ground_throw', 'pfp', 'position_work'],
  live_abs: ['live'],
};

/** For flat modules (fielding, catching, baserunning): filter out game source (games tracked in Game Hub) */
function filterFlatSources(sources: SourceItem[], sessionType?: string): SourceItem[] {
  if (!sessionType) return sources.filter(s => s.value !== 'game');
  return sources.filter(s => s.value !== 'game');
}

function filterGroupedSources(groups: SourceGroup[], validValues: string[]): SourceGroup[] {
  return groups
    .map(g => ({
      ...g,
      items: g.items.filter(item => validValues.includes(item.value)),
    }))
    .filter(g => g.items.length > 0);
}

function getFilteredGroups(module: string, sessionType?: string, groups?: SourceGroup[]): SourceGroup[] | null {
  if (!groups) return null;
  if (!sessionType) return groups;

  const validMap =
    module === 'hitting' ? VALID_HITTING_SOURCES :
    module === 'pitching' ? VALID_PITCHING_SOURCES :
    module === 'throwing' ? VALID_THROWING_SOURCES :
    null;

  if (!validMap) return groups;
  const valid = validMap[sessionType];
  if (!valid) return groups;
  return filterGroupedSources(groups, valid);
}

// ── UI Components ──────────────────────────────────────────────────

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

export function RepSourceSelector({ module, sessionType, value, onChange, customSource, onCustomSourceChange }: RepSourceSelectorProps) {
  // Grouped modules
  if (module === 'hitting' || module === 'pitching' || module === 'throwing') {
    const baseGroups =
      module === 'hitting' ? HITTING_SOURCES :
      module === 'pitching' ? PITCHING_SOURCES :
      THROWING_SOURCES;

    const filtered = getFilteredGroups(module, sessionType, baseGroups) ?? baseGroups;

    return (
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Rep Source <span className="text-destructive">*</span>
        </Label>
        <GroupedSelector groups={filtered} value={value} onChange={onChange} />
        {!value && <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>}
      </div>
    );
  }

  // Flat list for other modules
  const baseSources = FLAT_SOURCES[module] ?? FLAT_SOURCES.fielding;
  const sources = filterFlatSources(baseSources, sessionType);

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
      {value === 'other' && onCustomSourceChange && (
        <Input
          value={customSource ?? ''}
          onChange={(e) => onCustomSourceChange(e.target.value)}
          placeholder="Describe your rep source..."
          className="mt-2"
        />
      )}
      {!value && <p className="text-[10px] text-destructive mt-1">Select a rep source to continue</p>}
    </div>
  );
}
