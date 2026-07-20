/**
 * CompetitionLevelPicker — the single, sport-aware competition-context picker
 * used across onboarding, Tell Hammer, Game Setup, and Practice game logging.
 *
 * Two modes:
 *   - Legacy (string value): renders only the playing-tier grid. Used by
 *     Tell Hammer and Practice game logging where only the level matters.
 *   - Composite (object value): also renders age-group chips (when the tier
 *     is age-group-eligible), home/play state selects, and an optional
 *     "events" chip group. Used by onboarding to capture the full picture.
 */
import { useMemo, useState } from 'react';
import {
  getAgeGroupsForSport,
  getCompetitionLevelsByCategory,
} from '@/data/competitionWeighting';
import { getEventsForSport } from '@/data/competitionEvents';
import { US_STATES } from '@/data/usStates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Sport = 'baseball' | 'softball';

export interface CompetitionSelection {
  level: string;
  ageGroup?: string;
  homeState?: string;
  playState?: string;
  events?: string[];
}

interface Props {
  sport: Sport;
  /** String = legacy tier-only mode. Object = composite mode. */
  value: string | CompetitionSelection;
  onChange: (next: string | CompetitionSelection) => void;
  /** "full" = grouped chip grid showing every level. "quick" = collapsed by category. */
  mode?: 'full' | 'quick';
  className?: string;
}

export function CompetitionLevelPicker({ sport, value, onChange, mode = 'full', className }: Props) {
  const composite = typeof value === 'object' && value !== null;
  const selection: CompetitionSelection = composite
    ? value
    : { level: typeof value === 'string' ? value : '' };
  const levelKey = selection.level;

  const categories = useMemo(() => getCompetitionLevelsByCategory(sport), [sport]);
  const ageGroups = useMemo(() => getAgeGroupsForSport(sport), [sport]);
  const events = useMemo(() => getEventsForSport(sport), [sport]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const currentLevel = useMemo(
    () => categories.flatMap((c) => c.levels).find((l) => l.key === levelKey),
    [categories, levelKey],
  );
  const showAgeGroup = composite && !!currentLevel?.ageGroupEligible;
  const showStates = composite && !!currentLevel?.pre_collegiate;

  const emit = (patch: Partial<CompetitionSelection>) => {
    if (!composite) {
      // Legacy string mode: only the level flows out.
      if ('level' in patch && typeof patch.level === 'string') onChange(patch.level);
      return;
    }
    onChange({ ...selection, ...patch });
  };

  return (
    <div className={cn('space-y-4', className)} data-protected-editing="true">
      {/* Tier grid */}
      {categories.map((cat) => {
        const isQuick = mode === 'quick';
        const open = expanded[cat.category] ?? false;
        const visibleLevels = isQuick && !open ? cat.levels.slice(0, 4) : cat.levels;
        const selectedInCat = cat.levels.some((l) => l.key === levelKey);
        if (cat.levels.length === 0) return null;

        return (
          <div key={cat.category}>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {cat.label}
              {selectedInCat && <span className="ml-1 text-primary">●</span>}
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {visibleLevels.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => emit({ level: l.key, ageGroup: undefined })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-medium transition-all',
                    levelKey === l.key
                      ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                      : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground',
                  )}
                >
                  {l.label}
                </button>
              ))}
              {isQuick && cat.levels.length > 4 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setExpanded((s) => ({ ...s, [cat.category]: !open }))}
                >
                  {open ? 'Less' : `+${cat.levels.length - 4} more`}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Age group sub-picker (composite only, eligible tiers only) */}
      {showAgeGroup && (
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Age group
          </Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {ageGroups.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => emit({ ageGroup: g.key })}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs font-medium transition-all',
                  selection.ageGroup === g.key
                    ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                    : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Home state + play state (composite, pre-collegiate) */}
      {showStates && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Home state
            </Label>
            <Select
              value={selection.homeState ?? ''}
              onValueChange={(v) => emit({ homeState: v, playState: selection.playState ?? v })}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Where you live" /></SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Play state
              {selection.homeState && selection.playState && selection.homeState !== selection.playState && (
                <span className="ml-1 text-primary normal-case tracking-normal">· travel circuit</span>
              )}
            </Label>
            <Select
              value={selection.playState ?? ''}
              onValueChange={(v) => emit({ playState: v })}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Where you compete" /></SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Notable events — optional, kept out of level */}
      {composite && events.length > 0 && (
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Events you've competed in (optional)
          </Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {events.map((ev) => {
              const active = selection.events?.includes(ev.key) ?? false;
              return (
                <button
                  key={ev.key}
                  type="button"
                  onClick={() => {
                    const cur = selection.events ?? [];
                    emit({
                      events: active ? cur.filter((k) => k !== ev.key) : [...cur, ev.key],
                    });
                  }}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-medium transition-all',
                    active
                      ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                      : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground',
                  )}
                >
                  {ev.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Events are recorded separately — they don't change your level of play.
          </p>
        </div>
      )}
    </div>
  );
}
