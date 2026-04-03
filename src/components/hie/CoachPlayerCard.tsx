import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { HIESnapshot } from '@/hooks/useHIESnapshot';
import { getGradeLabel } from '@/lib/gradeLabel';
import { TrendingUp, TrendingDown, Minus, User, Flame, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  accelerating: <Flame className="h-3 w-3 text-orange-500" />,
  improving: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  inconsistent: <AlertTriangle className="h-3 w-3 text-yellow-500" />,
  stalled: <XCircle className="h-3 w-3 text-red-500" />,
};

interface CoachPlayerCardProps {
  snapshot: HIESnapshot;
  playerName?: string;
}

export function CoachPlayerCard({ snapshot, playerName }: CoachPlayerCardProps) {
  const navigate = useNavigate();
  const trend = snapshot.mpi_trend_7d ?? 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{playerName ?? snapshot.user_id.slice(0, 8)}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  MPI: <span className="font-medium text-foreground">{snapshot.mpi_score?.toFixed(1) ?? '—'}</span>
                </span>
                <div className="flex items-center gap-0.5">
                  <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                  <span className={`text-xs ${trendColor}`}>{trend > 0 ? '+' : ''}{trend}</span>
                </div>
                {STATUS_ICONS[snapshot.development_status]}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {snapshot.primary_limiter && (
              <Badge variant="outline" className="text-xs max-w-[140px] truncate">
                {snapshot.primary_limiter}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {snapshot.readiness_score}% ready
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => navigate(`/profile?userId=${snapshot.user_id}`)}
          >
            View Full Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
