/**
 * Foundation Recommendation Trace Inspector — Phase G1 + Phase H1/H2/H4.
 * - Cursor pagination (replaces fixed limit).
 * - Debounced unified search box (UUID/trigger/reason aware).
 * - CSV export honoring active filters with companion enrichment.
 * - Per-row replay/recompute with in-flight state and toasts.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TRACE_PAGE_SIZE,
  TRACE_EXPORT_MAX,
  TRACE_EXPORT_CHUNK,
  TRACE_SEARCH_DEBOUNCE_MS,
} from '@/lib/foundationThresholds';

interface TraceRow {
  trace_id: string;
  user_id: string;
  video_id: string;
  surface_origin: string;
  active_triggers: string[];
  matched_triggers: string[];
  raw_score: number | null;
  final_score: number | null;
  score_breakdown: Record<string, unknown>;
  recommendation_version: number;
  suppressed: boolean;
  suppression_reason: string | null;
  created_at: string;
}

type RowState = 'idle' | 'pending' | 'ok' | 'error';

const SURFACES = ['', 'library', 'hammer', 'today_tip', 'onboarding', 'recovery_flow', 'admin_replay'];
const REASONS = ['', 'onboarding_gate', 'exposure_cap', 'domain_quota', 'semantic_dupe', 'philosophy_cap', 'admin_recompute_marker'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Filters {
  userFilter: string;
  trigger: string;
  surface: string;
  reason: string;
  search: string;
}

function applyFilters(q: any, f: Filters) {
  if (f.userFilter.trim()) q = q.eq('user_id', f.userFilter.trim());
  if (f.surface) q = q.eq('surface_origin', f.surface);
  if (f.reason) q = q.eq('suppression_reason', f.reason);
  if (f.trigger.trim()) q = q.contains('active_triggers', [f.trigger.trim()]);
  const s = f.search.trim();
  if (s) {
    if (UUID_RE.test(s)) {
      // Match against the three UUID columns; OR over them.
      q = q.or(`trace_id.eq.${s},user_id.eq.${s},video_id.eq.${s}`);
    } else {
      q = q.ilike('suppression_reason', `%${s}%`);
    }
  }
  return q;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join('|') : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function FoundationTraceInspector() {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<TraceRow | null>(null);
  const [companion, setCompanion] = useState<{ fatigue: any[]; onboarding: any[] } | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [replayResult, setReplayResult] = useState<Record<string, any>>({});

  // filters
  const [userFilter, setUserFilter] = useState('');
  const [trigger, setTrigger] = useState('');
  const [surface, setSurface] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [recompUserId, setRecompUserId] = useState('');

  const filtersRef = useRef<Filters>({ userFilter, trigger, surface, reason, search });
  filtersRef.current = { userFilter, trigger, surface, reason, search };

  async function loadFirst() {
    setLoading(true);
    setExhausted(false);
    let q = (supabase as any)
      .from('foundation_recommendation_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(TRACE_PAGE_SIZE);
    q = applyFilters(q, filtersRef.current);
    const { data, error } = await q;
    if (error) {
      toast.error(`Load failed: ${error.message}`);
      setRows([]);
    } else {
      const got = (data ?? []) as TraceRow[];
      setRows(got);
      if (got.length < TRACE_PAGE_SIZE) setExhausted(true);
    }
    setLoading(false);
  }

  async function loadMore() {
    if (loadingMore || exhausted || rows.length === 0) return;
    setLoadingMore(true);
    const cursor = rows[rows.length - 1].created_at;
    let q = (supabase as any)
      .from('foundation_recommendation_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .lt('created_at', cursor)
      .limit(TRACE_PAGE_SIZE);
    q = applyFilters(q, filtersRef.current);
    const { data, error } = await q;
    if (error) {
      toast.error(`Load more failed: ${error.message}`);
    } else {
      const got = (data ?? []) as TraceRow[];
      setRows(prev => [...prev, ...got]);
      if (got.length < TRACE_PAGE_SIZE) setExhausted(true);
    }
    setLoadingMore(false);
  }

  // Initial load
  useEffect(() => { void loadFirst(); /* eslint-disable-next-line */ }, []);

  // Debounced auto-reload on search/filter change.
  useEffect(() => {
    const t = setTimeout(() => { void loadFirst(); }, TRACE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, userFilter, trigger, surface, reason]);

  async function inspect(r: TraceRow) {
    setSelected(r);
    setCompanion(null);
    const around = new Date(r.created_at).getTime();
    const lo = new Date(around - 60_000).toISOString();
    const hi = new Date(around + 60_000).toISOString();
    const [f, o] = await Promise.all([
      (supabase as any).from('foundation_fatigue_decisions')
        .select('*').eq('user_id', r.user_id).eq('video_id', r.video_id)
        .gte('decided_at', lo).lte('decided_at', hi).limit(5),
      (supabase as any).from('foundation_onboarding_decisions')
        .select('*').eq('user_id', r.user_id).eq('video_id', r.video_id)
        .gte('decided_at', lo).lte('decided_at', hi).limit(5),
    ]);
    setCompanion({ fatigue: f.data ?? [], onboarding: o.data ?? [] });
  }

  function setRowState(traceId: string, s: RowState) {
    setRowStates(prev => ({ ...prev, [traceId]: s }));
  }

  async function runReplay(r: TraceRow) {
    if (rowStates[r.trace_id] === 'pending') return;
    setRowState(r.trace_id, 'pending');
    const { data, error } = await (supabase as any).functions.invoke('foundations-replay', {
      body: { traceId: r.trace_id },
    });
    if (error) {
      setRowState(r.trace_id, 'error');
      toast.error(`Replay failed: ${error.message}`);
      setReplayResult(prev => ({ ...prev, [r.trace_id]: { error: error.message } }));
    } else {
      setRowState(r.trace_id, 'ok');
      toast.success(`Replay: ${data?.matched_count ?? 0}/${data?.total ?? 0} matched`);
      setReplayResult(prev => ({ ...prev, [r.trace_id]: data }));
    }
  }

  async function runRecomputeForRow(r: TraceRow) {
    const stateKey = `recompute:${r.trace_id}`;
    if (rowStates[stateKey] === 'pending') return;
    setRowState(stateKey, 'pending');
    const { data, error } = await (supabase as any).functions.invoke('foundations-recompute-user', {
      body: { userId: r.user_id },
    });
    if (error) {
      setRowState(stateKey, 'error');
      toast.error(`Recompute failed: ${error.message}`);
    } else {
      setRowState(stateKey, 'ok');
      toast.success(`Recompute queued · trace ${(data?.trace_id ?? '').slice(0, 8) || 'n/a'}`);
    }
  }

  async function runRecompute() {
    if (!recompUserId.trim()) return;
    const { data, error } = await (supabase as any).functions.invoke('foundations-recompute-user', {
      body: { userId: recompUserId.trim() },
    });
    if (error) toast.error(`Recompute failed: ${error.message}`);
    else {
      toast.success(`Recompute queued · trace ${(data?.trace_id ?? '').slice(0, 8) || 'n/a'}`);
      void loadFirst();
    }
  }

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    const tId = toast.loading('Exporting CSV…');
    const parts: string[] = [];
    const header = [
      'trace_id', 'created_at', 'user_id', 'video_id', 'surface_origin',
      'active_triggers', 'matched_triggers', 'raw_score', 'final_score',
      'suppressed', 'suppression_reason', 'recommendation_version',
      'fatigue_kept', 'fatigue_reason', 'fatigue_exposure_score',
      'onboarding_kept', 'onboarding_reason', 'onboarding_account_age_days',
    ];
    parts.push(header.join(','));

    let cursor: string | null = null;
    let total = 0;
    try {
      while (total < TRACE_EXPORT_MAX) {
        let q = (supabase as any)
          .from('foundation_recommendation_traces')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(Math.min(TRACE_EXPORT_CHUNK, TRACE_EXPORT_MAX - total));
        if (cursor) q = q.lt('created_at', cursor);
        q = applyFilters(q, filtersRef.current);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const chunk = (data ?? []) as TraceRow[];
        if (chunk.length === 0) break;

        // Companion enrichment for this chunk.
        const userIds = Array.from(new Set(chunk.map(r => r.user_id)));
        const videoIds = Array.from(new Set(chunk.map(r => r.video_id)));
        const [fRes, oRes] = await Promise.all([
          (supabase as any).from('foundation_fatigue_decisions')
            .select('user_id, video_id, decided_at, kept, reason, exposure_score')
            .in('user_id', userIds).in('video_id', videoIds).limit(5000),
          (supabase as any).from('foundation_onboarding_decisions')
            .select('user_id, video_id, decided_at, kept, reason, account_age_days')
            .in('user_id', userIds).in('video_id', videoIds).limit(5000),
        ]);
        const fByKey = new Map<string, any>();
        for (const d of (fRes.data ?? []) as any[]) {
          fByKey.set(`${d.user_id}|${d.video_id}|${d.decided_at}`, d);
        }
        const oByKey = new Map<string, any>();
        for (const d of (oRes.data ?? []) as any[]) {
          oByKey.set(`${d.user_id}|${d.video_id}|${d.decided_at}`, d);
        }
        const matchCompanion = (map: Map<string, any>, r: TraceRow) => {
          const t = new Date(r.created_at).getTime();
          let best: any = null; let bestDelta = Infinity;
          for (const [k, v] of map) {
            const [u, vid] = k.split('|');
            if (u !== r.user_id || vid !== r.video_id) continue;
            const dt = Math.abs(new Date(v.decided_at).getTime() - t);
            if (dt < bestDelta && dt <= 60_000) { best = v; bestDelta = dt; }
          }
          return best;
        };

        for (const r of chunk) {
          const f = matchCompanion(fByKey, r);
          const o = matchCompanion(oByKey, r);
          parts.push([
            r.trace_id, r.created_at, r.user_id, r.video_id, r.surface_origin,
            r.active_triggers, r.matched_triggers, r.raw_score, r.final_score,
            r.suppressed, r.suppression_reason, r.recommendation_version,
            f?.kept ?? '', f?.reason ?? '', f?.exposure_score ?? '',
            o?.kept ?? '', o?.reason ?? '', o?.account_age_days ?? '',
          ].map(csvEscape).join(','));
        }

        total += chunk.length;
        cursor = chunk[chunk.length - 1].created_at;
        toast.loading(`Exporting CSV… ${total} rows`, { id: tId });
        if (chunk.length < TRACE_EXPORT_CHUNK) break;
      }

      const blob = new Blob([parts.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foundation-traces-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      const partial = total >= TRACE_EXPORT_MAX ? ' (capped)' : '';
      toast.success(`Exported ${total} rows${partial}`, { id: tId });
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`, { id: tId });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Foundation Recommendation Traces</h1>
        <p className="text-sm text-muted-foreground">
          Cursor-paginated console of every Foundation surfacing decision.
        </p>
      </div>

      <Card className="p-3 space-y-3">
        <Input
          placeholder="Search: paste a UUID (trace/user/video) or text in suppression_reason…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="user_id" value={userFilter} onChange={e => setUserFilter(e.target.value)} />
          <Input placeholder="trigger (e.g. lost_feel)" value={trigger} onChange={e => setTrigger(e.target.value)} />
          <Select value={surface || 'any'} onValueChange={(v) => setSurface(v === 'any' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="surface_origin" /></SelectTrigger>
            <SelectContent>
              {SURFACES.map(s => <SelectItem key={s || 'any'} value={s || 'any'}>{s || 'any'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={reason || 'any'} onValueChange={(v) => setReason(v === 'any' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="suppression_reason" /></SelectTrigger>
            <SelectContent>
              {REASONS.map(r => <SelectItem key={r || 'any'} value={r || 'any'}>{r || 'any'}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={loadFirst}>Apply filters</Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <div className="flex-1" />
          <Input placeholder="recompute user_id" value={recompUserId} onChange={e => setRecompUserId(e.target.value)} className="max-w-sm" />
          <Button size="sm" variant="outline" onClick={runRecompute}>Recompute</Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No traces match.</Card>
      ) : (
        <>
          <div className="grid gap-2">
            {rows.map(r => {
              const rep = replayResult[r.trace_id];
              const replayState = rowStates[r.trace_id] ?? 'idle';
              const recompState = rowStates[`recompute:${r.trace_id}`] ?? 'idle';
              return (
                <Card key={r.trace_id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                        <Badge variant="outline">{r.surface_origin}</Badge>
                        {r.suppressed && <Badge variant="destructive">{r.suppression_reason ?? 'suppressed'}</Badge>}
                        <span className="font-mono">user {r.user_id.slice(0, 8)}</span>
                      </div>
                      <div className="text-sm font-mono truncate">video {r.video_id.slice(0, 8)} · score {Number(r.final_score ?? 0).toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">
                        active: {(r.active_triggers || []).join(', ') || '—'} · matched: {(r.matched_triggers || []).join(', ') || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {rep && (
                        <Badge variant={rep.error ? 'destructive' : 'default'}>
                          {rep.error ? 'err' : `${rep.matched_count}/${rep.total} ok`}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={replayState === 'pending'}
                        onClick={() => runReplay(r)}
                      >
                        {replayState === 'pending' ? '…' : 'Replay'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={recompState === 'pending'}
                        onClick={() => runRecomputeForRow(r)}
                      >
                        {recompState === 'pending' ? '…' : 'Recompute user'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => inspect(r)}>Inspect</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            {exhausted ? (
              <span className="text-xs text-muted-foreground">End of results · {rows.length} rows</span>
            ) : (
              <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${rows.length} so far)`}
              </Button>
            )}
          </div>
        </>
      )}

      {selected && (
        <Card className="p-4 sticky bottom-4 shadow-lg max-h-[60vh] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Trace {selected.trace_id.slice(0, 8)}</h2>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setCompanion(null); }}>Close</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="font-semibold mb-1">Trace</div>
              <pre className="bg-muted p-2 rounded overflow-auto max-h-64">{JSON.stringify(selected, null, 2)}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1">Fatigue decision</div>
              <pre className="bg-muted p-2 rounded overflow-auto max-h-64">{JSON.stringify(companion?.fatigue ?? '…', null, 2)}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1">Onboarding decision</div>
              <pre className="bg-muted p-2 rounded overflow-auto max-h-64">{JSON.stringify(companion?.onboarding ?? '…', null, 2)}</pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
