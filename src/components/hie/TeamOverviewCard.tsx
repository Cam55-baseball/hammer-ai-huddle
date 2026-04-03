import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIETeamSnapshot } from '@/hooks/useHIETeamSnapshot';
import { Users, TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function TeamOverviewCard() {
  const { teamSnapshot, playerSnapshots, isLoading } = useHIETeamSnapshot();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  // Compute from player snapshots if no team snapshot
  const avgMPI = playerSnapshots.length > 0
    ? playerSnapshots.reduce((sum, p) => sum + (p.mpi_score ?? 0), 0) / playerSnapshots.length
    : 0;

  const trendingUp = playerSnapshots.filter(p => (p.mpi_trend_7d ?? 0) > 2);
  const trendingDown = playerSnapshots.filter(p => (p.mpi_trend_7d ?? 0) < -2);
  const riskPlayers = playerSnapshots.filter(p => p.risk_alerts.length > 0);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{avgMPI.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Team MPI Avg</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{playerSnapshots.length}</div>
            <div className="text-xs text-muted-foreground">Players Analyzed</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{trendingUp.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">Trending Up</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{trendingDown.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">Trending Down</div>
          </div>
        </div>

        {riskPlayers.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Risk Alerts ({riskPlayers.length} players)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {riskPlayers.slice(0, 5).map(p => (
                <Badge key={p.user_id} variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  {p.user_id.slice(0, 6)}… — {p.risk_alerts[0]?.type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
