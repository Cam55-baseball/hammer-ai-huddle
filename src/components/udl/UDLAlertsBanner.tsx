import { Button } from '@/components/ui/button';
import { AlertTriangle, X, TrendingDown, Flame, Users } from 'lucide-react';
import type { UDLAlert } from '@/hooks/useCoachUDL';

interface Props {
  alerts: UDLAlert[];
  onDismiss: (alertId: string) => void;
}

const iconMap: Record<string, any> = {
  performance_drop: TrendingDown,
  fatigue_spike: Flame,
  team_pattern: Users,
  compliance_low: AlertTriangle,
};

const colorMap: Record<string, string> = {
  high: 'border-destructive/40 bg-destructive/5',
  medium: 'border-amber-500/40 bg-amber-500/5',
  low: 'border-muted-foreground/20 bg-muted/5',
};

export function UDLAlertsBanner({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = iconMap[alert.alert_type] ?? AlertTriangle;
        const colors = colorMap[alert.severity] ?? colorMap.low;

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${colors}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(alert.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
