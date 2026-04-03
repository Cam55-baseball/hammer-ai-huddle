import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { ShieldAlert } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/30',
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

export function RiskAlertsCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot || snapshot.risk_alerts.length === 0) return null;

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {snapshot.risk_alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 border rounded-lg p-3">
            <Badge variant="outline" className={SEVERITY_COLORS[alert.severity]}>
              {alert.severity}
            </Badge>
            <p className="text-sm">{alert.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
