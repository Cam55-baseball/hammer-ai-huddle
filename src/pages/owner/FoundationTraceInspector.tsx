/**
 * Foundation Recommendation Trace Inspector — Wave A admin tool.
 * Lets admins audit and replay any recommendation decision.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { replayRecommendation, type ReplayOutcome } from '@/lib/foundationReplay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function FoundationTraceInspector() {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TraceRow | null>(null);
  const [replay, setReplay] = useState<Record<string, ReplayOutcome>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('foundation_recommendation_traces')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  async function runReplay(traceId: string) {
    const r = await replayRecommendation(traceId);
    setReplay(prev => ({ ...prev, [traceId]: r }));
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Foundation Recommendation Traces</h1>
        <p className="text-sm text-muted-foreground">
          Latest 200 recommendation decisions. Click Replay to verify deterministic reproducibility.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          No traces yet. They appear as athletes are shown Foundation recommendations.
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map(r => {
            const rep = replay[r.trace_id];
            return (
              <Card key={r.trace_id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <Badge variant="outline">{r.surface_origin}</Badge>
                      {r.suppressed && <Badge variant="destructive">suppressed</Badge>}
                    </div>
                    <div className="text-sm font-mono truncate">video {r.video_id.slice(0, 8)} · score {Number(r.final_score ?? 0).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">
                      matched: {r.matched_triggers.join(', ') || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rep && (
                      <Badge variant={rep.matched ? 'default' : 'destructive'}>
                        {rep.matched ? 'replay ok' : `Δ ${(rep.replay_score ?? 0).toFixed(1)}`}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => runReplay(r.trace_id)}>
                      Replay
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      Inspect
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <Card className="p-4 sticky bottom-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Trace {selected.trace_id.slice(0, 8)}</h2>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
{JSON.stringify(selected, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
