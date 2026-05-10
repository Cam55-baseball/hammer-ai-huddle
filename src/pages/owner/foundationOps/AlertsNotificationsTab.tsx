/**
 * Alerts & Notifications tab — open alerts, dispatch log, master gate state.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import notificationEnablementMd from '@/../docs/foundations/notification-enablement.md?raw';
import { MarkdownPanel } from './MarkdownPanel';

interface Dispatch {
  id: string;
  alert_key: string;
  adapter: string;
  status: string;
  attempts: number | null;
  error: string | null;
  dispatched_at: string;
}

export function AlertsNotificationsTab() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('foundation_notification_dispatches')
        .select('id, alert_key, adapter, status, attempts, error, dispatched_at')
        .order('dispatched_at', { ascending: false })
        .limit(100);
      const rows = (data ?? []) as Dispatch[];
      setDispatches(rows);
      const c: Record<string, number> = {};
      for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  // We can't read secrets from the client; show informational pill instead.
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notification system status
        </h2>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Master gate:</span>
            <Badge variant="outline" className="gap-1"><BellOff className="h-3 w-3" /> Controlled by FOUNDATION_NOTIFICATIONS_ENABLED secret</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            When the gate is OFF every dispatch is logged as <code className="font-mono">skipped_disabled</code> (path is exercised, no message sent). Critical-only severity. 3-attempt retry, 20s outer timeout. See enablement order below.
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-5 gap-2 text-xs">
        {['ok', 'dlq', 'skipped_disabled', 'skipped_severity', 'skipped_idem', 'skipped_flap', 'config_invalid'].map((s) => (
          <Card key={s} className="p-2 text-center">
            <div className="text-muted-foreground">{s}</div>
            <div className="text-lg font-bold">{counts[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Last 100 dispatches</h2>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : dispatches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No dispatches recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1">When</th>
                  <th className="text-left">Alert</th>
                  <th className="text-left">Adapter</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="py-1 whitespace-nowrap">{new Date(d.dispatched_at).toLocaleString()}</td>
                    <td className="font-mono truncate max-w-[200px]">{d.alert_key}</td>
                    <td>{d.adapter}</td>
                    <td>
                      <Badge variant={d.status === 'ok' ? 'default' : d.status === 'dlq' || d.status === 'config_invalid' ? 'destructive' : 'outline'}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="text-right font-mono">{d.attempts ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MarkdownPanel title="Enablement order — production rollout" body={notificationEnablementMd} />
    </div>
  );
}
