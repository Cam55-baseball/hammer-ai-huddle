/**
 * Owner Alert Center — full-page view of every owner_alerts row.
 * Critical, unacknowledged alerts pinned at the top in red. Each row can be
 * acknowledged (audit-stamped) and shows full JSON detail.
 *
 * Also exposes the "Enable browser notifications" prompt — when granted, the
 * browser pops a native OS notification on every new critical, even if the
 * tab is in the background.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, BellRing, Check, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AlertRow {
  id: string;
  alert_key: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: Record<string, unknown>;
  minute_bucket: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const sevTone: Record<string, string> = {
  critical: 'border-rose-500/60 bg-rose-500/5',
  warning: 'border-amber-500/60 bg-amber-500/5',
  info: 'border-sky-500/60 bg-sky-500/5',
};

export default function OwnerAlertCenter() {
  const { user } = useAuth();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
  );

  const refresh = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('owner_alerts')
      .select('*')
      .order('acknowledged_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(200);
    setAlerts((data ?? []) as AlertRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (ownerLoading || !isOwner) return;
    refresh();
    const ch = supabase
      .channel('owner-alerts-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_alerts' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isOwner, ownerLoading]);

  const acknowledge = async (id: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('owner_alerts')
      .update({ acknowledged_by: user.id, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(`Could not acknowledge: ${error.message}`);
    else toast.success('Acknowledged');
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      new Notification('Hammers Modality alerts enabled', {
        body: 'You will receive a system notification on every new critical alert.',
      });
    }
  };

  const sendTestAlert = async () => {
    if (!user) return;
    const id = crypto.randomUUID();
    const bucket = new Date();
    bucket.setSeconds(0, 0);
    const { error } = await (supabase as any).from('owner_alerts').insert({
      alert_key: `test_${id.slice(0, 8)}`,
      severity: 'critical',
      title: 'Test alert from Owner Alert Center',
      detail: { source: 'manual_test', triggered_by: user.id, at: new Date().toISOString() },
      minute_bucket: bucket.toISOString(),
    });
    if (error) toast.error(`Test failed: ${error.message}`);
    else toast.success('Test alert fired — check the bell.');
  };

  if (ownerLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!isOwner) {
    return (
      <div className="p-8">
        <Card className="p-6 max-w-md mx-auto text-center">
          <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <h1 className="font-semibold mb-1">Owner only</h1>
          <p className="text-sm text-muted-foreground">This page is restricted to owners.</p>
        </Card>
      </div>
    );
  }

  const unacked = alerts.filter((a) => !a.acknowledged_at);
  const acked = alerts.filter((a) => a.acknowledged_at);

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/owner')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Owner
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5" /> Alert Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Critical Hammers Modality system events. Acknowledge to clear from the header bell.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={sendTestAlert}>
          Send test alert
        </Button>
      </div>

      {/* Browser notifications card */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <BellRing className="h-5 w-5 mt-0.5 text-primary" />
            <div className="text-sm">
              <div className="font-semibold">Browser notifications</div>
              <p className="text-muted-foreground text-xs mt-0.5">
                Get an OS-level pop-up on every new critical, even with the tab in the background.
                Per-browser, per-device — enable on each computer/phone you want to be alerted on.
              </p>
            </div>
          </div>
          <div>
            {notifPerm === 'granted' ? (
              <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Enabled</Badge>
            ) : notifPerm === 'denied' ? (
              <Badge variant="destructive">Blocked in browser settings</Badge>
            ) : notifPerm === 'unsupported' ? (
              <Badge variant="outline">Not supported</Badge>
            ) : (
              <Button size="sm" onClick={enableBrowserNotifications}>Enable</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Active section */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Needs attention</h2>
          <Badge variant={unacked.length > 0 ? 'destructive' : 'outline'}>{unacked.length}</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : unacked.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">All clear. 🎯</Card>
        ) : (
          unacked.map((a) => (
            <Card key={a.id} className={cn('p-3 border-l-4', sevTone[a.severity])}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={a.severity === 'critical' ? 'destructive' : 'default'}>
                      {a.severity}
                    </Badge>
                    <span className="font-semibold">{a.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.alert_key}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="default" onClick={() => acknowledge(a.id)}>
                  <Check className="h-4 w-4 mr-1" /> Acknowledge
                </Button>
              </div>
              {a.detail && Object.keys(a.detail).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View detail
                  </summary>
                  <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto max-h-60">
                    {JSON.stringify(a.detail, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
          ))
        )}
      </section>

      {/* History */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">History</h2>
          <Badge variant="outline">{acked.length}</Badge>
        </div>
        {acked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No acknowledged alerts yet.</p>
        ) : (
          <div className="space-y-1">
            {acked.slice(0, 100).map((a) => (
              <div key={a.id} className="text-xs flex items-center justify-between gap-2 border-b py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline">{a.severity}</Badge>
                  <span className="truncate">{a.title}</span>
                  <span className="font-mono text-muted-foreground truncate">{a.alert_key}</span>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  acked {a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
