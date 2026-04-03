import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIETeamSnapshot } from '@/hooks/useHIETeamSnapshot';
import { Bell, AlertTriangle, TrendingDown, ShieldAlert, Pause } from 'lucide-react';

export function CoachAlertPanel() {
  const { playerSnapshots } = useHIETeamSnapshot();

  const allAlerts: { userId: string; alert: any }[] = [];
  playerSnapshots.forEach(p => {
    p.risk_alerts.forEach(a => allAlerts.push({ userId: p.user_id, alert: a }));
  });

  // Also flag stalled/declining players
  const stalledPlayers = playerSnapshots.filter(p => p.development_status === 'stalled' && (p.mpi_trend_30d ?? 0) < -1);

  if (allAlerts.length === 0 && stalledPlayers.length === 0) return null;

  const ALERT_ICONS: Record<string, React.ReactNode> = {
    overtraining: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    decline: <TrendingDown className="h-4 w-4 text-red-500" />,
    stagnation: <Pause className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Alert System
          <Badge variant="destructive" className="text-xs">{allAlerts.length + stalledPlayers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {allAlerts.slice(0, 10).map((item, i) => (
          <div key={i} className="flex items-start gap-3 border rounded-lg p-3">
            {ALERT_ICONS[item.alert.type] ?? <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm">{item.alert.message}</div>
              <div className="text-xs text-muted-foreground">Player: {item.userId.slice(0, 8)}…</div>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">{item.alert.severity}</Badge>
          </div>
        ))}
        {stalledPlayers.map(p => (
          <div key={p.user_id} className="flex items-start gap-3 border rounded-lg p-3">
            <Pause className="h-4 w-4 text-red-500" />
            <div className="min-w-0 flex-1">
              <div className="text-sm">Player stalled with declining trend ({p.mpi_trend_30d})</div>
              <div className="text-xs text-muted-foreground">Player: {p.user_id.slice(0, 8)}…</div>
            </div>
            <Badge variant="outline" className="text-xs shrink-0 bg-red-500/10 text-red-600 border-red-500/30">plateau</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
