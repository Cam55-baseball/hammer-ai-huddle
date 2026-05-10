/**
 * Rollback procedures tab — read-only cards with copy-to-clipboard commands.
 * Intentionally no execute buttons; owner must run rollbacks consciously.
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Scenario {
  trigger: string;
  description: string;
  steps: string[];
  command?: string;
}

const SCENARIOS: Scenario[] = [
  {
    trigger: 'Notifications turned on by accident',
    description: 'Disable Slack/email blast immediately. Existing dispatch rows are preserved for audit.',
    steps: [
      'Open Backend → Cloud → Secrets',
      'Set FOUNDATION_NOTIFICATIONS_ENABLED to false',
      'Wait for the next foundation-health-alerts tick (≤ 1 hour) — adapters become inert.',
      'Verify in this dashboard\'s Alerts tab that new dispatches show status "skipped_disabled".',
    ],
    command: 'update_secret FOUNDATION_NOTIFICATIONS_ENABLED=false',
  },
  {
    trigger: 'Alerter producing false-positive criticals',
    description: 'A threshold drifted out of tune. No data loss — just noise.',
    steps: [
      'Open supabase/functions/_shared/foundationThresholds.ts',
      'Adjust the ALERT.* threshold value(s) you want softened',
      'Save — the edge function redeploys automatically',
      'Open alerts that should clear will auto-resolve once the condition clears (≥2 min).',
    ],
  },
  {
    trigger: 'Retention deleted unintended rows',
    description: 'Retention is DELETE-only. Open alerts are protected (hard guard). Recovery requires PITR.',
    steps: [
      'Stop further damage: temporarily set the cron job for daily-trace-prune to disabled.',
      'Open Backend → Cloud and request Point-In-Time Recovery for the affected table to a timestamp before the bad delete.',
      'After restore, re-enable cron and audit cleanup_old_foundation_ops_logs() to confirm guard logic.',
    ],
  },
  {
    trigger: 'Phase II tables / indexes need to come out',
    description: 'Full Phase II rollback. Uninstalls the notification + retention infrastructure.',
    steps: [
      'Run the SQL command shown below as a migration.',
      'Redeploy edge functions to drop references.',
      'Verify foundation_health_alerts still exists if you want to keep alert history.',
    ],
    command: `DROP TABLE public.foundation_notification_dispatches CASCADE;
DROP INDEX IF EXISTS idx_fha_resolved_severity;
DROP INDEX IF EXISTS idx_fha_alert_key_resolved;
DROP FUNCTION IF EXISTS public.cleanup_old_foundation_ops_logs;`,
  },
];

export function RollbackTab() {
  const copy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast({ title: 'Command copied', description: 'Paste into your terminal or migration file.' });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-l-4 border-l-amber-500/60 bg-amber-500/5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Rollback is manual on purpose.</p>
            <p className="text-muted-foreground">
              These cards copy commands to your clipboard but do not execute anything. Read each step before running the command.
            </p>
          </div>
        </div>
      </Card>

      {SCENARIOS.map((s) => (
        <Card key={s.trigger} className="p-4">
          <h3 className="font-semibold">{s.trigger}</h3>
          <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
          <ol className="list-decimal list-inside text-sm mt-3 space-y-1">
            {s.steps.map((st, i) => <li key={i}>{st}</li>)}
          </ol>
          {s.command && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Command</span>
                <Button variant="outline" size="sm" onClick={() => copy(s.command!)}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">{s.command}</pre>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
