/**
 * Phase II — Additive observability panels for FoundationHealthDashboard.
 * Resolved alerts (last 30d), replay drift trend, last-N replay mismatches.
 *
 * All queries are bounded and indexed. Empty/error/loading states handled.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ALERT, type AlertSeverity } from '@/lib/foundationThresholds';

type LoadState = 'loading' | 'ready' | 'error';

interface ResolvedAlert {
  id: string;
  alert_key: string;
  severity: AlertSeverity;
  title: string;
  first_seen_at: string;
  resolved_at: string;
}

interface MismatchSample {
  id: string;
  ran_at: string;
  trace_id: string | null;
  drift_reason: string | null;
  original_score: number | null;
  replay_score: number | null;
}

interface DriftBucket { dayIso: string; total: number; mismatched: number }

const PAGE_SIZE = 25;
const SEVERITIES: Array<'all' | AlertSeverity> = ['all', 'critical', 'warning', 'info'];

export function ResolvedAlertsPanel() {
  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<ResolvedAlert[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [severity, setSeverity] = useState<'all' | AlertSeverity>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce search input → search state.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 0 whenever filters change.
  useEffect(() => { setPage(0); }, [severity, search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
      let q = (supabase as any)
        .from('foundation_health_alerts')
        .select('id, alert_key, severity, title, first_seen_at, resolved_at')
        .not('resolved_at', 'is', null)
        .gte('resolved_at', since30)
        .order('resolved_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (severity !== 'all') q = q.eq('severity', severity);
      if (search) q = q.ilike('alert_key', `%${search}%`);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) { setState('error'); return; }
      const all = (data ?? []) as ResolvedAlert[];
      setRows(all.slice(0, PAGE_SIZE));
      setHasMore(all.length > PAGE_SIZE);
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, [page, severity, search]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold">Resolved alerts (last 30d)</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="text-xs border rounded px-2 py-1 bg-background"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'all' | AlertSeverity)}
          >
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input
            className="h-8 w-44 text-xs"
            placeholder="search alert_key"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {state === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {state === 'error' && <p className="text-sm text-destructive">Failed to load resolved alerts.</p>}
      {state === 'ready' && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No resolved alerts in this window.</p>
      )}
      {state === 'ready' && rows.length > 0 && (
        <ul className="space-y-2 text-sm">
          {rows.map(r => (
            <li key={r.id} className="border rounded p-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={r.severity === 'critical' ? 'destructive' : r.severity === 'warning' ? 'default' : 'outline'}>{r.severity}</Badge>
                <span className="font-medium truncate">{r.title}</span>
                <span className="font-mono text-xs text-muted-foreground truncate">{r.alert_key}</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                resolved {new Date(r.resolved_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-3">
        <Button variant="outline" size="sm" disabled={page === 0 || state === 'loading'} onClick={() => setPage(p => Math.max(0, p - 1))}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">page {page + 1}</span>
        <Button variant="outline" size="sm" disabled={!hasMore || state === 'loading'} onClick={() => setPage(p => p + 1)}>
          Next
        </Button>
      </div>
    </Card>
  );
}

function bucketize(rows: Array<{ ran_at: string; matched: boolean }>): DriftBucket[] {
  const map = new Map<string, DriftBucket>();
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    map.set(d, { dayIso: d, total: 0, mismatched: 0 });
  }
  for (const r of rows) {
    const day = r.ran_at.slice(0, 10);
    const b = map.get(day);
    if (!b) continue;
    b.total += 1;
    if (r.matched === false) b.mismatched += 1;
  }
  return Array.from(map.values());
}

export function ReplayDriftTrendPanel() {
  const [state, setState] = useState<LoadState>('loading');
  const [buckets, setBuckets] = useState<DriftBucket[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data, error } = await (supabase as any)
        .from('foundation_replay_outcomes')
        .select('ran_at, matched')
        .gte('ran_at', since7)
        .order('ran_at', { ascending: false })
        .limit(20_000);
      if (cancelled) return;
      if (error) { setState('error'); return; }
      setBuckets(bucketize((data ?? []) as Array<{ ran_at: string; matched: boolean }>));
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, []);

  const { rates, totalSamples, sparkPath, maxRate, lowSample } = useMemo(() => {
    const rs = buckets.map(b => (b.total > 0 ? b.mismatched / b.total : 0));
    const total = buckets.reduce((s, b) => s + b.total, 0);
    const max = Math.max(0.0001, ...rs);
    const w = 200, h = 40;
    const step = buckets.length > 1 ? w / (buckets.length - 1) : 0;
    const path = rs.map((r, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - (r / max) * h).toFixed(1)}`).join(' ');
    return { rates: rs, totalSamples: total, sparkPath: path, maxRate: max, lowSample: total < ALERT.REPLAY_MISMATCH_MIN_SAMPLE };
  }, [buckets]);

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-2">Replay drift trend (7d)</h2>
      {state === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {state === 'error' && <p className="text-sm text-destructive">Failed to load drift trend.</p>}
      {state === 'ready' && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>samples: {totalSamples}</span>
            <span>peak: {(maxRate * 100).toFixed(1)}%</span>
            {lowSample && <Badge variant="outline">below sample threshold (n&lt;{ALERT.REPLAY_MISMATCH_MIN_SAMPLE})</Badge>}
          </div>
          <svg viewBox="0 0 200 40" className="w-full h-12 mt-2" aria-label="replay drift sparkline">
            <path d={sparkPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
          </svg>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mt-1">
            {buckets.map((b, i) => (
              <div key={b.dayIso} className="text-center">
                <div className="font-mono">{b.dayIso.slice(5)}</div>
                <div>{b.total > 0 ? `${(rates[i] * 100).toFixed(0)}%` : '—'}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function ReplayMismatchSamplesPanel() {
  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<MismatchSample[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      const { data, error } = await (supabase as any)
        .from('foundation_replay_outcomes')
        .select('id, ran_at, trace_id, drift_reason, original_score, replay_score')
        .eq('matched', false)
        .order('ran_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (error) { setState('error'); return; }
      setRows((data ?? []) as MismatchSample[]);
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-2">Recent replay mismatches</h2>
      {state === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {state === 'error' && <p className="text-sm text-destructive">Failed to load mismatch samples.</p>}
      {state === 'ready' && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No mismatches recorded.</p>
      )}
      {state === 'ready' && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr><th className="text-left py-1">When</th><th className="text-left">Trace</th><th className="text-left">Reason</th><th className="text-right">Δ score</th></tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const orig = r.original_score ?? 0;
                const rep = r.replay_score ?? 0;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="py-1 whitespace-nowrap">{new Date(r.ran_at).toLocaleString()}</td>
                    <td className="font-mono truncate max-w-[120px]">{r.trace_id ?? '—'}</td>
                    <td>{r.drift_reason ?? '—'}</td>
                    <td className="text-right font-mono">{orig} → {rep}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function FoundationOpsObservability() {
  return (
    <div className="space-y-4">
      <ResolvedAlertsPanel />
      <div className="grid md:grid-cols-2 gap-4">
        <ReplayDriftTrendPanel />
        <ReplayMismatchSamplesPanel />
      </div>
    </div>
  );
}
