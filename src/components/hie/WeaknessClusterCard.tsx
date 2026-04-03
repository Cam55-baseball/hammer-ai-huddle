import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { AlertTriangle } from 'lucide-react';

const IMPACT_COLORS = {
  high: 'bg-red-500/10 text-red-600 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

export function WeaknessClusterCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot || snapshot.weakness_clusters.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          What's Holding You Back
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot.weakness_clusters.map((cluster, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">{cluster.issue}</span>
              <Badge variant="outline" className={IMPACT_COLORS[cluster.impact]}>
                {cluster.impact.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Caused by:</span> {cluster.why}
            </p>
            {cluster.data_points?.score !== undefined && (
              <p className="text-xs text-muted-foreground">
                Current score: <span className="font-medium">{cluster.data_points.score}</span>/80
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
