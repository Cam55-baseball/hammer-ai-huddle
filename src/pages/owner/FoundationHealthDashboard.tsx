/**
 * Foundation Health & Alerts Dashboard — Phase G4 + Phase H3.
 * Operational heartbeat for crons, recommendation funnel, trigger health,
 * state-machine activity, and persisted health alerts.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CRON_STALE_MIN,
  ALERT,
  SYSTEM_USER_ID,
  type AlertSeverity,
} from '@/lib/foundationThresholds';
import FoundationOpsObservability from './FoundationOpsObservability';
import { RetentionTab } from './foundationOps/RetentionTab';
import { CronJobsTab } from './foundationOps/CronJobsTab';
import { AlertsNotificationsTab } from './foundationOps/AlertsNotificationsTab';
import { RollbackTab } from './foundationOps/RollbackTab';
import { RunbookTab } from './foundationOps/RunbookTab';

interface CronBeat { function_name: string; ran_at: string; duration_ms: number | null; status: string; error: string | null }
interface FunnelDay { day: string; surfaced: number; suppressed: number; suppressedByReason: Record<string, number> }
interface TriggerHealth { active: number; avg_confidence: number; stuck30d: number }
interface StateHealth { transitions7d: number }
interface AlertRow {
  id: string;
  alert_key: string;
  severity: AlertSeverity;
  title: string;
  detail: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
}

const CRON_FNS = Object.keys(CRON_STALE_MIN);

function statusFor(beat: CronBeat | undefined, fn: string): 'green' | 'amber' | 'red' {
  const maxAgeMin = CRON_STALE_MIN[fn] ?? 90;
  if (!beat) return 'red';
  if (beat.status !== 'ok') return 'red';
  const ageMin = (Date.now() - new Date(beat.ran_at).getTime()) / 60_000;
  if (ageMin > maxAgeMin * ALERT.HEARTBEAT_MISSING_CRIT_RATIO) return 'red';
  if (ageMin > maxAgeMin) return 'amber';
  return 'green';
}

const pill = (s: 'green' | 'amber' | 'red') => (
  <span className={
    'inline-block w-2 h-2 rounded-full ' +
    (s === 'green' ? 'bg-emerald-500' : s === 'amber' ? 'bg-amber-500' : 'bg-rose-500')
  } />
);

const sevVariant = (s: AlertSeverity) =>
  s === 'critical' ? 'destructive' : s === 'warning' ? 'default' : 'outline';

interface OpsSummary {
  open_critical: number;
  open_warning: number;
  open_info: number;
  last_alerter_at: string | null;
  last_alerter_ms: number | null;
  failed_replays_24h: number;
}
interface ReplayDrift { total: number; mismatched: number; rate: number }

export default function FoundationHealthDashboard() {
  const navigate = useNavigate();
  const [beats, setBeats] = useState<Record<string, CronBeat | undefined>>({});
  const [funnel, setFunnel] = useState<FunnelDay[]>([]);
  const [trigger, setTrigger] = useState<TriggerHealth | null>(null);
  const [stateH, setStateH] = useState<StateHealth | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [ops, setOps] = useState<OpsSummary | null>(null);
  const [drift, setDrift] = useState<ReplayDrift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [beatsRes, tracesRes, trigRes, stateRes, alertsRes] = await Promise.all([
        (supabase as any)
          .from('foundation_cron_heartbeats')
          .select('function_name, ran_at, duration_ms, status, error')
          .order('ran_at', { ascending: false })
          .limit(200),
        (supabase as any)
          .from('foundation_recommendation_traces')
          .select('created_at, suppressed, suppression_reason')
          .neq('user_id', SYSTEM_USER_ID)
          .gte('created_at', since7)
          .limit(5000),
        (supabase as any)
          .from('foundation_trigger_events')
          .select('confidence, fired_at, resolved_at')
          .is('resolved_at', null)
          .limit(2000),
        (supabase as any)
          .from('athlete_foundation_state')
          .select('state_entered_at')
          .gte('state_entered_at', since7)
          .limit(2000),
        (supabase as any)
          .from('foundation_health_alerts')
          .select('id, alert_key, severity, title, detail, first_seen_at, last_seen_at')
          .is('resolved_at', null)
          .order('severity', { ascending: false })
          .order('last_seen_at', { ascending: false })
          .limit(50),
      ]);

      const beatsByFn: Record<string, CronBeat | undefined> = {};
      for (const b of (beatsRes.data ?? []) as CronBeat[]) {
        if (!beatsByFn[b.function_name]) beatsByFn[b.function_name] = b;
      }
      setBeats(beatsByFn);

      const dayMap = new Map<string, FunnelDay>();
      for (const t of (tracesRes.data ?? []) as any[]) {
        const d = String(t.created_at).slice(0, 10);
        if (!dayMap.has(d)) dayMap.set(d, { day: d, surfaced: 0, suppressed: 0, suppressedByReason: {} });
        const row = dayMap.get(d)!;
        if (t.suppressed) {
          row.suppressed += 1;
          const r = t.suppression_reason ?? 'unknown';
          row.suppressedByReason[r] = (row.suppressedByReason[r] ?? 0) + 1;
        } else {
          row.surfaced += 1;
        }
      }
      setFunnel(Array.from(dayMap.values()).sort((a, b) => b.day.localeCompare(a.day)));

      const trigs = (trigRes.data ?? []) as any[];
      const avg = trigs.length > 0
        ? trigs.reduce((s, t) => s + Number(t.confidence ?? 0), 0) / trigs.length
        : 0;
      const stuck = trigs.filter(
        t => (Date.now() - new Date(t.fired_at).getTime()) / 86400_000 > ALERT.STUCK_TRIGGER_DAYS,
      ).length;
      setTrigger({ active: trigs.length, avg_confidence: Number(avg.toFixed(2)), stuck30d: stuck });

      setStateH({ transitions7d: (stateRes.data ?? []).length });
      setAlerts(((alertsRes.data ?? []) as AlertRow[]));

      // Phase I: ops summary + replay drift (additive, bounded queries).
      const since24 = new Date(Date.now() - 86_400_000).toISOString();
      const [roRes, lastBeatRes] = await Promise.all([
        (supabase as any)
          .from('foundation_replay_outcomes')
          .select('matched')
          .gte('ran_at', since24)
          .limit(5_000),
        (supabase as any)
          .from('foundation_cron_heartbeats')
          .select('ran_at, duration_ms, status')
          .eq('function_name', 'foundation-health-alerts')
          .eq('status', 'ok')
          .order('ran_at', { ascending: false })
          .limit(1),
      ]);
      const ro = (roRes.data ?? []) as Array<{ matched: boolean }>;
      const roTotal = ro.length;
      const roMismatch = ro.filter(r => r.matched === false).length;
      setDrift({
        total: roTotal,
        mismatched: roMismatch,
        rate: roTotal > 0 ? Number((roMismatch / roTotal).toFixed(3)) : 0,
      });
      const allOpen = (alertsRes.data ?? []) as AlertRow[];
      const lastBeat = (lastBeatRes.data ?? [])[0] as { ran_at: string; duration_ms: number | null } | undefined;
      setOps({
        open_critical: allOpen.filter(a => a.severity === 'critical').length,
        open_warning: allOpen.filter(a => a.severity === 'warning').length,
        open_info: allOpen.filter(a => a.severity === 'info').length,
        last_alerter_at: lastBeat?.ran_at ?? null,
        last_alerter_ms: lastBeat?.duration_ms ?? null,
        failed_replays_24h: roMismatch,
      });

      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Foundations Health & Alerts</h1>
        <p className="text-sm text-muted-foreground">Operational heartbeat for the Foundations engine.</p>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="health">Live Health</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts &amp; Notifications</TabsTrigger>
          <TabsTrigger value="rollback">Rollback</TabsTrigger>
          <TabsTrigger value="runbook">Runbook</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4 mt-4">
          {/* Ops summary — Phase I */}
          <Card className="p-4">
            <h2 className="font-semibold mb-2">Foundations ops summary</h2>
            {ops ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Open alerts</div>
                  <div className="flex gap-1 items-center mt-1">
                    <Badge variant="destructive">{ops.open_critical}</Badge>
                    <Badge>{ops.open_warning}</Badge>
                    <Badge variant="outline">{ops.open_info}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last alerter run</div>
                  <div className="mt-1 text-xs">
                    {ops.last_alerter_at ? new Date(ops.last_alerter_at).toLocaleString() : '—'}
                    {ops.last_alerter_ms != null && <span className="text-muted-foreground"> · {ops.last_alerter_ms}ms</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Failed replays (24h)</div>
                  <div className="mt-1"><Badge variant={ops.failed_replays_24h > 0 ? 'destructive' : 'outline'}>{ops.failed_replays_24h}</Badge></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Replay drift rate (24h)</div>
                  <div className="mt-1"><Badge variant={drift && drift.rate >= ALERT.REPLAY_MISMATCH_WARN ? 'destructive' : 'outline'}>
                    {drift ? `${(drift.rate * 100).toFixed(1)}%` : '—'}
                  </Badge></div>
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground">Loading…</p>}
          </Card>

          {/* Active alerts */}
          <Card className="p-4">
            <h2 className="font-semibold mb-2">Active alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All clear.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {alerts.map(a => (
                  <li key={a.id} className="border rounded p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={sevVariant(a.severity)}>{a.severity}</Badge>
                        <span className="font-medium truncate">{a.title}</span>
                        <span className="font-mono text-xs text-muted-foreground truncate">{a.alert_key}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        since {new Date(a.first_seen_at).toLocaleString()}
                      </span>
                    </div>
                    {a.detail && Object.keys(a.detail).length > 0 && (
                      <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-auto max-h-40">
                        {JSON.stringify(a.detail, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {loading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h2 className="font-semibold mb-2">Cron health</h2>
                <ul className="space-y-2 text-sm">
                  {CRON_FNS.map(fn => {
                    const b = beats[fn];
                    const s = statusFor(b, fn);
                    return (
                      <li key={fn} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {pill(s)}
                          <span className="font-mono text-xs truncate">{fn}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {b ? new Date(b.ran_at).toLocaleString() : 'no heartbeat'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card className="p-4">
                <h2 className="font-semibold mb-2">Recommendation funnel (7d)</h2>
                <div className="space-y-1 text-sm max-h-64 overflow-auto">
                  {funnel.map(d => (
                    <div key={d.day} className="flex items-center justify-between gap-2 border-b py-1">
                      <span className="font-mono">{d.day}</span>
                      <span>surfaced {d.surfaced} · suppressed {d.suppressed}</span>
                      <span className="text-xs text-muted-foreground">
                        {Object.entries(d.suppressedByReason).map(([k, v]) => `${k}:${v}`).join(' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="font-semibold mb-2">Trigger health</h2>
                {trigger && (
                  <div className="space-y-1 text-sm">
                    <div>Active unresolved: <Badge>{trigger.active}</Badge></div>
                    <div>Avg confidence: <Badge variant="outline">{trigger.avg_confidence}</Badge></div>
                    <div>
                      Stuck &gt; {ALERT.STUCK_TRIGGER_DAYS}d:{' '}
                      <Badge variant={trigger.stuck30d > ALERT.STUCK_TRIGGER_WARN ? 'destructive' : 'outline'}>
                        {trigger.stuck30d}
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h2 className="font-semibold mb-2">State machine</h2>
                {stateH && (
                  <div className="text-sm">
                    Transitions in last 7d: <Badge>{stateH.transitions7d}</Badge>
                  </div>
                )}
              </Card>
            </div>
          )}

          <FoundationOpsObservability />
        </TabsContent>

        <TabsContent value="retention" className="mt-4"><RetentionTab /></TabsContent>
        <TabsContent value="cron" className="mt-4"><CronJobsTab /></TabsContent>
        <TabsContent value="alerts" className="mt-4"><AlertsNotificationsTab /></TabsContent>
        <TabsContent value="rollback" className="mt-4"><RollbackTab /></TabsContent>
        <TabsContent value="runbook" className="mt-4"><RunbookTab /></TabsContent>
      </Tabs>
    </div>
  );
}
