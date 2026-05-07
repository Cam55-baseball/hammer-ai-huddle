import { useSeasonStatus } from '@/hooks/useSeasonStatus';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_STYLES: Record<string, string> = {
  preseason:   'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  in_season:   'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  post_season: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  off_season:  'bg-muted text-muted-foreground border-border',
};

export function SeasonPhaseChip({ className }: { className?: string }) {
  const { resolvedPhase, phaseDaysIn, phaseDaysRemaining, phaseProfile, isLoading } = useSeasonStatus();
  if (isLoading) return null;

  const detail =
    phaseDaysIn != null && phaseDaysRemaining != null
      ? phaseDaysRemaining < 14
        ? `${phaseDaysRemaining}d left`
        : `Day ${phaseDaysIn + 1}`
      : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80',
            PHASE_STYLES[resolvedPhase] ?? PHASE_STYLES.off_season,
            className
          )}
          aria-label={`Current season phase: ${phaseProfile.label}`}
        >
          <CalendarDays className="h-3 w-3" />
          <span>{phaseProfile.label}</span>
          {detail && <span className="opacity-70">· {detail}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm">
        <div className="space-y-2">
          <div className="font-semibold">{phaseProfile.label}</div>
          {phaseDaysIn != null && phaseDaysRemaining != null && (
            <div className="text-xs text-muted-foreground">
              Day {phaseDaysIn + 1} · {phaseDaysRemaining} days until next phase
            </div>
          )}
          <p className="text-xs text-muted-foreground">{phaseProfile.toneGuidance}</p>
          <Link
            to="/profile"
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            Edit season dates →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
