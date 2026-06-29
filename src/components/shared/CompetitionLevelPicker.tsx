/**
 * CompetitionLevelPicker — the single, sport-aware competition level picker
 * used across onboarding, Tell Hammer, Game Setup, and Practice game logging.
 *
 * Reads from the canonical `getCompetitionLevelsByCategory(sport)` source so
 * every surface stays in sync — adding a new level in one place adds it
 * everywhere automatically.
 */
import { useMemo, useState } from 'react';
import { getCompetitionLevelsByCategory } from '@/data/competitionWeighting';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Sport = 'baseball' | 'softball';

interface Props {
  sport: Sport;
  value: string;
  onChange: (key: string) => void;
  /** "full" = grouped chip grid showing every level. "quick" = collapsed by category. */
  mode?: 'full' | 'quick';
  className?: string;
}

export function CompetitionLevelPicker({ sport, value, onChange, mode = 'full', className }: Props) {
  const categories = useMemo(() => getCompetitionLevelsByCategory(sport), [sport]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className={cn('space-y-2', className)} data-protected-editing="true">
      {categories.map((cat) => {
        const isQuick = mode === 'quick';
        const open = expanded[cat.category] ?? false;
        // In quick mode, show the top 4 most common rungs per category, then "More…"
        const visibleLevels = isQuick && !open ? cat.levels.slice(0, 4) : cat.levels;
        const selectedInCat = cat.levels.some((l) => l.key === value);

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
                  onClick={() => onChange(l.key)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-medium transition-all',
                    value === l.key
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
    </div>
  );
}
