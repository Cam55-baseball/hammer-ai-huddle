import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMPIScores } from '@/hooks/useMPIScores';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getGradeLabel } from '@/lib/gradeLabel';

export function MPIScoreCard() {
  const { data: mpi, isLoading } = useMPIScores();

  const score = Math.round(mpi?.adjusted_global_score || 0);
  const TrendIcon = mpi?.trend_direction === 'rising' ? TrendingUp : mpi?.trend_direction === 'dropping' ? TrendingDown : Minus;
  const trendColor = mpi?.trend_direction === 'rising' ? 'text-green-500' : mpi?.trend_direction === 'dropping' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> MPI Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : mpi ? (
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{score}</span>
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-primary">{getGradeLabel(score)}</span>
              {mpi.global_percentile != null && (
                <span className="text-muted-foreground">· {Math.round(mpi.global_percentile)}th percentile</span>
              )}
            </div>
            {mpi.global_rank != null && (
              <p className="text-xs text-muted-foreground">
                Rank #{mpi.global_rank} of {mpi.total_athletes_in_pool ?? 0}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Log sessions to build your MPI score</p>
        )}
      </CardContent>
    </Card>
  );
}
