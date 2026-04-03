import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { TrendingUp, CheckCircle2 } from 'lucide-react';

export function ProofCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot) return null;

  const hasTrends = snapshot.before_after_trends.length > 0;
  const hasDrillEffectiveness = snapshot.drill_effectiveness.length > 0;

  if (!hasTrends && !hasDrillEffectiveness) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Proof of progress will appear as you follow prescribed drills and track results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Proof It's Working
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasTrends && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Weakness Resolution</div>
            {snapshot.before_after_trends.map((trend: any, i: number) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-2">
                <span className="text-sm">{trend.area}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{trend.before} →</span>
                  <span className="text-sm font-medium text-green-600">{trend.after}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasDrillEffectiveness && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Drill Effectiveness</div>
            {snapshot.drill_effectiveness.map((drill: any, i: number) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-2">
                <span className="text-sm">{drill.name}</span>
                <Badge variant={drill.effective ? 'default' : 'secondary'}>
                  {drill.effective ? 'Working' : 'No Change'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
