import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoachAthleteSummaries } from '@/hooks/useCoachAthleteSummaries';
import { CoachAthleteScannableCard } from './CoachAthleteScannableCard';

interface Props {
  linkedPlayerIds: string[];
  playerNames: Record<string, string>;
}

/**
 * Coach dashboard §9.5 — per-athlete scannable roster.
 * Sits above the flat Session Feed; the feed remains for chronological review.
 */
export function CoachAthleteRoster({ linkedPlayerIds, playerNames }: Props) {
  const { data, isLoading } = useCoachAthleteSummaries(linkedPlayerIds);

  if (linkedPlayerIds.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Athlete Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Official grades, trends and recent activity per athlete. Self-reported grades stay private to the athlete.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading
          ? linkedPlayerIds.slice(0, 3).map((id) => <Skeleton key={id} className="h-32 w-full" />)
          : linkedPlayerIds.map((id) => (
              <CoachAthleteScannableCard
                key={id}
                athleteId={id}
                name={playerNames[id] ?? 'Athlete'}
                summary={data?.[id]}
              />
            ))}
      </CardContent>
    </Card>
  );
}
