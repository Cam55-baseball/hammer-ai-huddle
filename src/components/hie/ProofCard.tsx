import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { TrendingUp, TrendingDown, CheckCircle2, Minus } from 'lucide-react';

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
            Proof of progress will appear after your next analysis cycle compares your scores over time.
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
            <div className="text-sm font-medium">14-Day Trends</div>
            {snapshot.before_after_trends.map((trend: any, i: number) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-2">
                <span className="text-sm">{trend.area}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{trend.before}</span>
                  {trend.improving ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : trend.delta < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={`text-sm font-medium ${trend.improving ? 'text-green-600' : trend.delta < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {trend.after}
                  </span>
                  <Badge variant={trend.improving ? 'default' : 'secondary'} className="text-xs">
                    {trend.delta > 0 ? '+' : ''}{trend.delta}
                  </Badge>
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
                <div className="min-w-0 flex-1">
                  <span className="text-sm">{drill.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{drill.area}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {drill.adherence > 0 && (
                    <span className="text-xs text-muted-foreground">{drill.adherence} sessions</span>
                  )}
                  <Badge variant={drill.effective === true ? 'default' : drill.effective === false ? 'secondary' : 'outline'}>
                    {drill.effective === true ? 'Working' : drill.effective === false ? 'No Change' : 'Tracking...'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
