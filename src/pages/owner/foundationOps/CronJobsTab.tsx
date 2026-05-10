/**
 * Cron Jobs tab — full live view of foundation cron heartbeats with run-now actions.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CRON_STALE_MIN, ALERT } from '@/lib/foundationThresholds';
import { Play, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Beat { function_name: string; ran_at: string; duration_ms: number | null; status: string; error: string | null; metadata: any }

const SCHEDULES: Record<string, string> = {
  'foundation-health-alerts': '5 * * * * (hourly)',
  'foundation-alert-retention': '30 4 * * * (daily 04:30 UTC)',
  'daily-trace-prune': '0 3 * * * (daily 03:00 UTC)',
  'nightly-foundation-health': '0 2 * * * (daily 02:00 UTC)',
  'recompute-foundation-effectiveness': '0 5 * * * (daily 05:00 UTC)',
  'hourly-trigger-decay': '15 * * * * (hourly)',
};

function statusOf(beat: Beat | undefined, fn: string): { color: string; label: string } {
  const maxAge = CRON_STALE_MIN[fn] ?? 90;
  if (!beat) return { color: 'bg-rose-500', label: 'no heartbeat' };
  if (beat.status !== 'ok') return { color: 'bg-rose-500', label: 'last run errored' };
  const ageMin = (Date.now() - new Date(beat.ran_at).getTime()) / 60_000;
  if (ageMin > maxAge * ALERT.HEARTBEAT_MISSING_CRIT_RATIO) return { color: 'bg-rose-500', label: `stale ${Math.round(ageMin)}m` };
  if (ageMin > maxAge) return { color: 'bg-amber-500', label: `late ${Math.round(ageMin)}m` };
  return { color: 'bg-emerald-500', label: 'healthy' };
}

export function CronJobsTab() {
  const [beats, setBeats] = useState<Record<string, Beat>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('foundation_cron_heartbeats')
      .select('function_name, ran_at, duration_ms, status, error, metadata')
      .order('ran_at', { ascending: false })
      .limit(500);
    const byFn: Record<string, Beat> = {};
    for (const b of (data ?? []) as Beat[]) {
      if (!byFn[b.function_name]) byFn[b.function_name] = b;
    }
    setBeats(byFn);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const runNow = async (fn: string) => {
    setRunning(fn);
    try {
      const { error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      toast({ title: `${fn} triggered`, description: 'Heartbeat will refresh in a moment.' });
      setTimeout(() => void load(), 2000);
    } catch (e: any) {
      toast({ title: `${fn} failed`, description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          All foundation cron jobs and their last heartbeat. Click <span className="font-medium">Run now</span> to re-trigger any job manually.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={'h-3.5 w-3.5 mr-1 ' + (loading ? 'animate-spin' : '')} /> Refresh
        </Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Function</th>
                <th className="text-left px-3 py-2">Schedule</th>
                <th className="text-left px-3 py-2">Last run</th>
                <th className="text-left px-3 py-2">Duration</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(SCHEDULES).map((fn) => {
                const b = beats[fn];
                const s = statusOf(b, fn);
                return (
                  <tr key={fn} className="border-t">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span className={'inline-block w-2 h-2 rounded-full ' + s.color} />
                        <span className="text-xs">{s.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{fn}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{SCHEDULES[fn]}</td>
                    <td className="px-3 py-2 text-xs">{b ? new Date(b.ran_at).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-xs">{b?.duration_ms != null ? `${b.duration_ms}ms` : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={running === fn}
                        onClick={() => runNow(fn)}
                      >
                        <Play className="h-3 w-3 mr-1" /> {running === fn ? 'Running…' : 'Run now'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
