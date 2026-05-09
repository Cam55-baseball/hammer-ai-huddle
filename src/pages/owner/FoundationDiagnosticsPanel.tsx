/**
 * Foundation Diagnostics Panel — Wave D admin observability surface.
 * Pulls aggregated counts from traces, outcomes and library_videos and
 * surfaces low-health content + suppression breakdown for owners.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LowHealthRow {
  id: string;
  title: string | null;
  foundation_health_score: number | null;
  foundation_health_flags: string[] | null;
  foundation_health_checked_at: string | null;
}

interface SuppressionCount { reason: string; count: number; }
interface TriggerCount { trigger: string; count: number; }

export default function FoundationDiagnosticsPanel() {
  const [lowHealth, setLowHealth] = useState<LowHealthRow[]>([]);
  const [suppression, setSuppression] = useState<SuppressionCount[]>([]);
  const [triggers, setTriggers] = useState<TriggerCount[]>([]);
  const [totals, setTotals] = useState({ surfaced: 0, suppressed: 0, outcomes7d: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

        const [{ data: lh }, { data: traces }, { data: outcomes7d }] = await Promise.all([
          (supabase as any)
            .from('library_videos')
            .select('id, title, foundation_health_score, foundation_health_flags, foundation_health_checked_at')
            .eq('video_class', 'foundation')
            .not('foundation_health_score', 'is', null)
            .lt('foundation_health_score', 70)
            .order('foundation_health_score', { ascending: true })
            .limit(50),
          (supabase as any)
            .from('foundation_recommendation_traces')
            .select('suppressed, suppression_reason, active_triggers')
            .gte('created_at', since7)
            .limit(5000),
          (supabase as any)
            .from('foundation_video_outcomes')
            .select('id', { count: 'exact', head: true })
            .gte('shown_at', since7),
        ]);

        setLowHealth((lh ?? []) as LowHealthRow[]);

        const supMap = new Map<string, number>();
        const trigMap = new Map<string, number>();
        let surfaced = 0; let suppressed = 0;
        for (const t of (traces ?? []) as any[]) {
          if (t.suppressed) {
            suppressed += 1;
            const r = t.suppression_reason ?? 'unknown';
            supMap.set(r, (supMap.get(r) ?? 0) + 1);
          } else {
            surfaced += 1;
          }
          for (const a of (t.active_triggers ?? [])) {
            trigMap.set(a, (trigMap.get(a) ?? 0) + 1);
          }
        }
        setSuppression([...supMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
        setTriggers([...trigMap.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count));
        setTotals({ surfaced, suppressed, outcomes7d: (outcomes7d as any)?.count ?? 0 });
      } catch (e) {
        console.error('diagnostics load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Foundation Diagnostics</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/owner/foundations/traces">Open Trace Inspector →</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile label="Surfaced (7d)" value={totals.surfaced} />
            <StatTile label="Suppressed (7d)" value={totals.suppressed} />
            <StatTile label="Outcomes (7d)" value={totals.outcomes7d} />
          </div>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">Active triggers — last 7 days</h2>
            {triggers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No triggers fired.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {triggers.map(t => (
                  <Badge key={t.trigger} variant="secondary">
                    {t.trigger} · {t.count}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">Suppression breakdown — last 7 days</h2>
            {suppression.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suppressions.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {suppression.map(s => (
                  <li key={s.reason} className="flex justify-between border-b border-border py-1">
                    <span>{s.reason}</span>
                    <span className="font-mono">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">
              Low-health foundations <span className="text-xs text-muted-foreground">(score &lt; 70)</span>
            </h2>
            {lowHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground">All foundations healthy.</p>
            ) : (
              <div className="space-y-2">
                {lowHealth.map(v => (
                  <div key={v.id} className="border border-border rounded p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.title ?? '(untitled)'}</span>
                      <Badge variant="destructive">{v.foundation_health_score}</Badge>
                    </div>
                    {v.foundation_health_flags && v.foundation_health_flags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {v.foundation_health_flags.map(f => (
                          <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    )}
                    {v.foundation_health_checked_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Checked {new Date(v.foundation_health_checked_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-1">{value.toLocaleString()}</div>
    </Card>
  );
}
