/**
 * Retention tab — shows what data is kept forever vs pruned, with live counts.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock } from 'lucide-react';

interface OpsTableStat { table: string; description: string; count: number | null; oldest: string | null; newest: string | null }

const FOREVER_TABLES: { table: string; description: string }[] = [
  { table: 'custom_activity_logs', description: 'Every rep, set, and session you log — the source of truth for the entire engine.' },
  { table: 'athlete_daily_log', description: 'Daily injury and override records.' },
  { table: 'engine_snapshot_versions', description: 'Hammer engine snapshots — your full progression timeline.' },
  { table: 'athlete_foundation_state', description: 'Per-athlete current foundation state.' },
  { table: 'library_videos.foundation_effectiveness', description: 'Permanent rollups: per-trigger resolveRate, helpRate, sample_n.' },
  { table: 'library_videos.foundation_health_score', description: 'Permanent per-video health score (0–100) + flags.' },
  { table: 'profiles', description: 'DOB, sport, position — single source of truth for age & metrics.' },
  { table: 'Vault entries (videos, journals, photos)', description: 'Long-term performance archive — never pruned.' },
  { table: 'Game scoring (games, plate_appearances, lineup, stats)', description: 'Career game history — never pruned.' },
  { table: 'Nutrition / hydration / supplements', description: 'Permanent intake history.' },
];

const PRUNED_TABLES: { table: string; description: string; window: string }[] = [
  { table: 'foundation_recommendation_traces', description: 'Why each video was surfaced or suppressed (raw breadcrumbs).', window: '365 days' },
  { table: 'foundation_fatigue_decisions', description: 'Per-decision fatigue suppression breadcrumbs.', window: '365 days' },
  { table: 'foundation_onboarding_decisions', description: 'Onboarding gate breadcrumbs.', window: '365 days' },
  { table: 'foundation_health_alerts (resolved only)', description: 'Closed system alerts. Open alerts are never deleted.', window: '365 days' },
  { table: 'foundation_notification_dispatches', description: 'Slack/email send log.', window: '365 days' },
  { table: 'foundation_cron_heartbeats', description: 'Did the nightly job run? logs.', window: '365 days' },
  { table: 'foundation_replay_outcomes', description: 'Drift detection samples.', window: '365 days' },
];

const LIVE_OPS_TABLES = [
  'foundation_recommendation_traces',
  'foundation_fatigue_decisions',
  'foundation_onboarding_decisions',
  'foundation_notification_dispatches',
  'foundation_cron_heartbeats',
  'foundation_replay_outcomes',
];

export function RetentionTab() {
  const [stats, setStats] = useState<Record<string, { count: number | null }>>({});
  const [lastPrune, setLastPrune] = useState<{ ran_at: string; metadata: any } | null>(null);

  useEffect(() => {
    (async () => {
      const out: Record<string, { count: number | null }> = {};
      await Promise.all(
        LIVE_OPS_TABLES.map(async (t) => {
          try {
            const { count } = await (supabase as any)
              .from(t)
              .select('*', { count: 'exact', head: true });
            out[t] = { count: count ?? 0 };
          } catch {
            out[t] = { count: null };
          }
        }),
      );
      setStats(out);

      const { data: lp } = await (supabase as any)
        .from('foundation_cron_heartbeats')
        .select('ran_at, metadata')
        .eq('function_name', 'daily-trace-prune')
        .order('ran_at', { ascending: false })
        .limit(1);
      setLastPrune((lp ?? [])[0] ?? null);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 border-l-4 border-l-blue-500/60 bg-blue-500/5">
        <div className="text-sm">
          <p className="font-semibold mb-1">How retention works</p>
          <p className="text-muted-foreground">
            Every diagnostic log gets <em>summarized into a permanent rollup</em> before its raw row is pruned.
            Athlete progress data is <strong>never</strong> deleted. System telemetry is kept for <strong>365 days</strong> for deep debugging.
          </p>
          {lastPrune && (
            <p className="text-xs text-muted-foreground mt-2">
              Last prune: {new Date(lastPrune.ran_at).toLocaleString()} ·{' '}
              {lastPrune.metadata?.ops_logs_cleanup
                ? `removed ${JSON.stringify(lastPrune.metadata.ops_logs_cleanup)}`
                : 'no ops cleanup data'}
            </p>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-emerald-600" />
            <h2 className="font-semibold">Kept forever (athlete data)</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {FOREVER_TABLES.map((f) => (
              <li key={f.table} className="border-l-2 border-emerald-500/40 pl-2 py-1">
                <div className="font-mono text-xs">{f.table}</div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold">Pruned after 365 days (system logs)</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {PRUNED_TABLES.map((p) => {
              const tableKey = p.table.split(' ')[0];
              const live = stats[tableKey];
              return (
                <li key={p.table} className="border-l-2 border-amber-500/40 pl-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs truncate">{p.table}</div>
                    <Badge variant="outline" className="text-[10px]">{p.window}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                  {live && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      current rows: <span className="font-mono">{live.count?.toLocaleString() ?? '—'}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
