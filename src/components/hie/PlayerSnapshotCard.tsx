import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { getGradeLabel } from '@/lib/gradeLabel';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Flame, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  accelerating: { label: '🔥 Accelerating', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: <Flame className="h-4 w-4" /> },
  improving: { label: '🟢 Improving', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: <CheckCircle2 className="h-4 w-4" /> },
  inconsistent: { label: '🟡 Inconsistent', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: <AlertTriangle className="h-4 w-4" /> },
  stalled: { label: '🔴 Stalled', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: <XCircle className="h-4 w-4" /> },
};

export function PlayerSnapshotCard() {
  const { snapshot, isLoading, refreshAnalysis, isRefreshing } = useHIESnapshot();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">No analysis data yet. Run your first analysis to get started.</p>
          <Button onClick={() => refreshAnalysis()} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Run Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[snapshot.development_status] ?? STATUS_CONFIG.stalled;
  const tier = snapshot.mpi_score ? getGradeLabel(snapshot.mpi_score) : 'N/A';

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Game Right Now</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refreshAnalysis()} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MPI + Tier + Status row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{snapshot.mpi_score?.toFixed(1) ?? '—'}</div>
            <div className="text-xs text-muted-foreground">MPI Score</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{tier}</div>
            <div className="text-xs text-muted-foreground">Development Tier</div>
          </div>
          <Badge variant="outline" className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Trend arrows */}
        <div className="flex gap-4">
          <TrendBadge label="7d" value={snapshot.mpi_trend_7d} />
          <TrendBadge label="30d" value={snapshot.mpi_trend_30d} />
          <div className="text-center">
            <div className="text-sm font-medium">{snapshot.development_confidence}%</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
        </div>

        {/* Primary Limiter */}
        {snapshot.primary_limiter && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Primary Limiter</div>
            <div className="text-base font-semibold text-destructive">{snapshot.primary_limiter}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined) return null;
  const isUp = value > 0;
  const isDown = value < 0;
  return (
    <div className="flex items-center gap-1">
      {isUp ? <TrendingUp className="h-3 w-3 text-green-500" /> : isDown ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
      <span className={`text-sm font-medium ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
        {isUp ? '+' : ''}{value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
