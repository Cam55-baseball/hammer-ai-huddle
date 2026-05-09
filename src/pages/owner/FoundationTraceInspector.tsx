/**
 * Foundation Recommendation Trace Inspector v2 — Phase G1.
 * Filterable console with drilldown drawer, replay button, and admin recompute.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const SURFACES = ['', 'library', 'hammer', 'today_tip', 'onboarding', 'recovery_flow', 'admin_replay'];
const REASONS = ['', 'onboarding_gate', 'exposure_cap', 'domain_quota', 'semantic_dupe', 'philosophy_cap', 'admin_recompute_marker'];

export default function FoundationTraceInspector() {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TraceRow | null>(null);
  const [companion, setCompanion] = useState<{ fatigue: any[]; onboarding: any[] } | null>(null);
  const [replayResult, setReplayResult] = useState<Record<string, any>>({});

  // filters
  const [userFilter, setUserFilter] = useState('');
  const [trigger, setTrigger] = useState('');
  const [surface, setSurface] = useState('');
  const [reason, setReason] = useState('');
  const [recompUserId, setRecompUserId] = useState('');

  async function load() {
    setLoading(true);
    let q = (supabase as any)
      .from('foundation_recommendation_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (userFilter.trim()) q = q.eq('user_id', userFilter.trim());
    if (surface) q = q.eq('surface_origin', surface);
    if (reason) q = q.eq('suppression_reason', reason);
    if (trigger) q = q.contains('active_triggers', [trigger]);
    const { data, error } = await q;
    if (!error) setRows((data ?? []) as TraceRow[]);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

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

  async function runReplay(traceId: string) {
    const { data, error } = await (supabase as any).functions.invoke('foundations-replay', {
      body: { traceId },
    });
    setReplayResult(prev => ({ ...prev, [traceId]: error ? { error: error.message } : data }));
  }

  async function runRecompute() {
    if (!recompUserId.trim()) return;
    const { data, error } = await (supabase as any).functions.invoke('foundations-recompute-user', {
      body: { userId: recompUserId.trim() },
    });
    if (error) alert('Recompute failed: ' + error.message);
    else { alert('Recompute queued. trace_id: ' + (data?.trace_id ?? 'n/a')); void load(); }
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Foundation Recommendation Traces</h1>
        <p className="text-sm text-muted-foreground">
          Filterable console of every Foundation surfacing decision (last 200 matching).
        </p>
      </div>

      <Card className="p-3 space-y-3">
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
        <div className="flex gap-2">
          <Button size="sm" onClick={load}>Apply filters</Button>
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
        <div className="grid gap-2">
          {rows.map(r => {
            const rep = replayResult[r.trace_id];
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
                  <div className="flex items-center gap-2">
                    {rep && (
                      <Badge variant={rep.error ? 'destructive' : 'default'}>
                        {rep.error ? 'err' : `${rep.matched_count}/${rep.total} ok`}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => runReplay(r.trace_id)}>Replay</Button>
                    <Button size="sm" variant="ghost" onClick={() => inspect(r)}>Inspect</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
