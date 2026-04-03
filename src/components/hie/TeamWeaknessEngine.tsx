import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIETeamSnapshot } from '@/hooks/useHIETeamSnapshot';
import { Target } from 'lucide-react';

export function TeamWeaknessEngine() {
  const { playerSnapshots } = useHIETeamSnapshot();

  if (playerSnapshots.length === 0) return null;

  // Aggregate weakness areas across all players
  const areaCounts: Record<string, { count: number; issue: string }> = {};
  playerSnapshots.forEach(p => {
    p.weakness_clusters.forEach(w => {
      if (!areaCounts[w.area]) areaCounts[w.area] = { count: 0, issue: w.issue };
      areaCounts[w.area].count++;
    });
  });

  const sorted = Object.entries(areaCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 3);

  if (sorted.length === 0) return null;

  const total = playerSnapshots.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Team Weakness Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map(([area, { count, issue }]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={area} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{issue}</span>
                <Badge variant="secondary">{pct}% of team</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {count} of {total} players affected
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
