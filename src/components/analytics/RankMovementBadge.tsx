import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMPIScores } from '@/hooks/useMPIScores';
import { Skeleton } from '@/components/ui/skeleton';

export function RankMovementBadge() {
  const { data: mpi, isLoading } = useMPIScores();

  const direction = mpi?.trend_direction ?? 'stable';
  const delta = mpi?.trend_delta_30d ?? 0;
  const Icon = direction === 'rising' ? TrendingUp : direction === 'dropping' ? TrendingDown : Minus;
  const color = direction === 'rising' ? 'text-green-500' : direction === 'dropping' ? 'text-red-500' : 'text-muted-foreground';
  const label = direction === 'rising' ? 'Rising' : direction === 'dropping' ? 'Dropping' : 'Stable';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">30-Day Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : mpi ? (
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${color}`} />
            <div>
              <p className={`text-lg font-bold ${color}`}>{label}</p>
              {delta !== 0 && (
                <p className="text-sm text-muted-foreground">
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)} pts
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not yet ranked</p>
        )}
      </CardContent>
    </Card>
  );
}
