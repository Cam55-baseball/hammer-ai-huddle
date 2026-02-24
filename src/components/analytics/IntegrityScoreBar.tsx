import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck } from 'lucide-react';
import { useMPIScores } from '@/hooks/useMPIScores';

export function IntegrityScoreBar() {
  const { data: mpi } = useMPIScores();
  const score = mpi?.integrity_score ?? 0;

  const indicatorColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Integrity Score
          </div>
          <span className="text-sm font-bold">{Math.round(score)}</span>
        </div>
        <Progress value={score} className="h-2" indicatorClassName={indicatorColor} />
      </CardContent>
    </Card>
  );
}
