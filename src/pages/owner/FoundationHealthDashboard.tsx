/**
 * Foundation Health & Alerts Dashboard — Phase G4.
 * Reads existing tables to surface operational heartbeat for crons,
 * recommendation funnel, trigger health, and state machine activity.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CronBeat { function_name: string; ran_at: string; duration_ms: number | null; status: string; error: string | null }
interface FunnelDay { day: string; surfaced: number; suppressed: number; suppressedByReason: Record<string, number> }
interface TriggerHealth { active: number; avg_confidence: number; stuck30d: number }
interface StateHealth { transitions7d: number }

const CRON_FNS = [
  'nightly-foundation-effectiveness',
  'nightly-foundation-health',
  'hourly-trigger-decay',
  'daily-trace-prune',
];

function statusFor(beat?: CronBeat, maxAgeMin = 90): 'green' | 'amber' | 'red' {
  if (!beat) return 'red';
  if (beat.status !== 'ok') return 'red';
  const ageMin = (Date.now() - new Date(beat.ran_at).getTime()) / 60_000;
  if (ageMin > maxAgeMin * 2) return 'red';
  if (ageMin > maxAgeMin) return 'amber';
  return 'green';
}

const pill = (s: 'green' | 'amber' | 'red') => (
  <span className={
    'inline-block w-2 h-2 rounded-full ' +
    (s === 'green' ? 'bg-emerald-500' : s === 'amber' ? 'bg-amber-500' : 'bg-rose-500')
  } />
);

export default function FoundationHealthDashboard() {
  const [beats, setBeats] = useState<Record<string, CronBeat | undefined>>({});
  const [funnel, setFunnel] = useState<FunnelDay[]>([]);
  const [trigger, setTrigger] = useState<TriggerHealth | null>(null);
  const [stateH, setStateH] = useState<StateHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [beatsRes, tracesRes, trigRes, stateRes] = await Promise.all([
        (supabase as any)
          .from('foundation_cron_heartbeats')
          .select('*')
          .order('ran_at', { ascending: false })
          .limit(100),
        (supabase as any)
          .from('foundation_recommendation_traces')
          .select('created_at, suppressed, suppression_reason')
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
      ]);

      // latest beat per function
      const beatsByFn: Record<string, CronBeat | undefined> = {};
      for (const b of (beatsRes.data ?? []) as CronBeat[]) {
        if (!beatsByFn[b.function_name]) beatsByFn[b.function_name] = b;
      }
      setBeats(beatsByFn);

      // funnel rollup
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

      // trigger health
      const trigs = (trigRes.data ?? []) as any[];
      const avg = trigs.length > 0
        ? trigs.reduce((s, t) => s + Number(t.confidence ?? 0), 0) / trigs.length
        : 0;
      const stuck = trigs.filter(t => (Date.now() - new Date(t.fired_at).getTime()) / 86400_000 > 30).length;
      setTrigger({ active: trigs.length, avg_confidence: Number(avg.toFixed(2)), stuck30d: stuck });

      // state health
      setStateH({ transitions7d: (stateRes.data ?? []).length });

      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Foundations Health & Alerts</h1>
        <p className="text-sm text-muted-foreground">Operational heartbeat for the Foundations engine.</p>
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-2">Cron health</h2>
            <ul className="space-y-2 text-sm">
              {CRON_FNS.map(fn => {
                const b = beats[fn];
                const s = statusFor(b, fn === 'hourly-trigger-decay' ? 90 : 60 * 26);
                return (
                  <li key={fn} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">{pill(s)}<span className="font-mono">{fn}</span></span>
                    <span className="text-xs text-muted-foreground">
                      {b ? `${new Date(b.ran_at).toLocaleString()} · ${b.duration_ms ?? '?'}ms` : 'no beat yet'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Heartbeats are written by each cron at completion. Missing beats = function never ran (or pre-Phase G).</p>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-2">Recommendation funnel (7d)</h2>
            <div className="text-xs text-muted-foreground mb-2">
              total surfaced: {funnel.reduce((s, d) => s + d.surfaced, 0)} ·
              suppressed: {funnel.reduce((s, d) => s + d.suppressed, 0)}
            </div>
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
                <div>Stuck &gt; 30d: <Badge variant={trigger.stuck30d > 0 ? 'destructive' : 'outline'}>{trigger.stuck30d}</Badge></div>
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
    </div>
  );
}
