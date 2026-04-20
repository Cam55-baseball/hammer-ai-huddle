import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { AlertTriangle } from 'lucide-react';
import { VideoSuggestionsPanel } from '@/components/video-suggestions/VideoSuggestionsPanel';
import { mapHIEAreaToMovement } from '@/lib/analysisToTaxonomy';

const IMPACT_COLORS = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
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
              <span className="font-medium">Why:</span> {cluster.why}
            </p>
            {cluster.data_points?.value !== undefined && (
              <p className="text-xs text-muted-foreground">
                {cluster.data_points.metric}: <span className="font-medium">{cluster.data_points.value}</span>
                {cluster.data_points.threshold && <span> (threshold: {cluster.data_points.threshold})</span>}
              </p>
            )}
          </div>
        ))}
        {(() => {
          const movements = snapshot.weakness_clusters
            .map(c => mapHIEAreaToMovement((c as any).area || c.issue))
            .filter((x): x is string => !!x);
          if (!movements.length) return null;
          return (
            <VideoSuggestionsPanel
              skillDomain="hitting"
              mode="long_term"
              movementPatterns={movements}
              title="Watch related videos"
            />
          );
        })()}
      </CardContent>
    </Card>
  );
}
