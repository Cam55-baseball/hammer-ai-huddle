import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';
import { useMPIScores } from '@/hooks/useMPIScores';
import { ProProbabilityCap } from './ProProbabilityCap';
import { Skeleton } from '@/components/ui/skeleton';

export function ProProbabilityCard() {
  const { data: mpi, isLoading } = useMPIScores();
  const prob = mpi?.pro_probability ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Pro Probability
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : mpi ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{prob.toFixed(1)}%</span>
              {mpi.pro_probability_capped && <ProProbabilityCap sport={mpi.sport} />}
            </div>
            <Progress value={Math.min(prob, 100)} className="h-2" />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Build data to calculate</p>
        )}
      </CardContent>
    </Card>
  );
}
