import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useHoFEligibility } from '@/hooks/useHoFEligibility';
import { MLBSeasonCounter } from './MLBSeasonCounter';

export function HoFCountdown() {
  const { isProVerified, hofActivated, totalProSeasons, seasonsRemaining, mlbSeasons, auslSeasons } = useHoFEligibility();

  if (!isProVerified) return null;

  return (
    <Card>
      <CardContent className="pt-4 flex items-center gap-4">
        <Trophy className={`h-6 w-6 shrink-0 ${hofActivated ? 'text-yellow-500' : 'text-muted-foreground'}`} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MLBSeasonCounter mlbSeasons={mlbSeasons} auslSeasons={auslSeasons} />
          </div>
          <p className="text-sm text-muted-foreground">
            {hofActivated
              ? 'Hall of Fame tracking activated!'
              : `HoF in ${seasonsRemaining} more season${seasonsRemaining !== 1 ? 's' : ''}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
