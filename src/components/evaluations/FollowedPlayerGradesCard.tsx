import { Loader2 } from 'lucide-react';
import { useAthleteEvaluations } from '@/hooks/useEvaluations';
import { ConfirmedSummaryCard } from './ConfirmedSummaryCard';
import { PositionGradeSummaryCard } from './PositionGradeSummaryCard';

/**
 * The athlete's running scout-grade average, shown to a coach/scout viewing the
 * profile of a player they follow. Same component and same logic the athlete
 * sees — RLS only returns confirmed official reports to accepted followers.
 */
export function FollowedPlayerGradesCard({ athleteId }: { athleteId: string | undefined }) {
  const { data: reports = [], isLoading } = useAthleteEvaluations(athleteId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading scouting grades…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmedSummaryCard reports={reports as unknown as Record<string, unknown>[]} />
      <PositionGradeSummaryCard reports={reports} />
    </div>
  );
}
