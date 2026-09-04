import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck } from 'lucide-react';
import { useMPIScores } from '@/hooks/useMPIScores';

/**
 * Integrity is a corroboration measure. When nothing corroborates the
 * athlete's own logging yet, the nightly job stores null — and this bar says
 * so rather than showing a 0 (which reads as a failure) or a 100 (which is a
 * fabricated perfect score).
 */
export function IntegrityScoreBar() {
  const { data: mpi } = useMPIScores();
  const score = mpi?.integrity_score ?? null;

  const indicatorColor =
    score == null ? 'bg-muted' : score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Integrity Score
          </div>
          <span className="text-sm font-bold">
            {score == null ? <span className="text-muted-foreground font-normal">Not scored yet</span> : Math.round(score)}
          </span>
        </div>
        <Progress value={score ?? 0} className="h-2" indicatorClassName={indicatorColor} />
        {score == null && (
          <p className="text-xs text-muted-foreground">
            Needs something to check your logging against — a coach-verified session or
            logged game reps. Nothing is assumed until then.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
