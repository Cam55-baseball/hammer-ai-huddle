import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GovernanceFlagCardProps {
  flag: {
    id: string;
    flag_type: string;
    severity?: string | null;
    user_id: string;
    status?: string | null;
    details?: any;
    created_at: string;
    admin_action?: string | null;
    admin_notes?: string | null;
  };
  onResolve?: (flagId: string, action: string) => void;
  showActions?: boolean;
}

const severityConfig: Record<string, { icon: any; color: string }> = {
  low: { icon: Flag, color: 'text-blue-600' },
  medium: { icon: AlertTriangle, color: 'text-amber-600' },
  high: { icon: XCircle, color: 'text-red-600' },
  critical: { icon: XCircle, color: 'text-red-700' },
};

export function GovernanceFlagCard({ flag, onResolve, showActions = true }: GovernanceFlagCardProps) {
  const sev = severityConfig[flag.severity ?? 'medium'] ?? severityConfig.medium;
  const Icon = sev.icon;
  const isResolved = flag.status === 'resolved';

  return (
    <Card className={cn(isResolved && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', sev.color)} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">{flag.flag_type.replace(/_/g, ' ')}</p>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                isResolved ? 'bg-green-500/20 text-green-700' : 'bg-amber-500/20 text-amber-700'
              )}>
                {isResolved ? 'Resolved' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(flag.created_at).toLocaleDateString()} • Severity: {flag.severity ?? 'medium'}
            </p>
            {flag.admin_notes && (
              <p className="text-xs text-muted-foreground italic">Note: {flag.admin_notes}</p>
            )}
          </div>
        </div>

        {showActions && !isResolved && onResolve && (
          <div className="flex gap-2 mt-3 ml-8">
            <Button size="sm" variant="outline" onClick={() => onResolve(flag.id, 'dismissed')} className="text-xs h-7">
              Dismiss
            </Button>
            <Button size="sm" onClick={() => onResolve(flag.id, 'upheld')} className="text-xs h-7">
              <CheckCircle className="h-3 w-3 mr-1" /> Uphold
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
