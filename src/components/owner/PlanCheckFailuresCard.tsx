import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { summarizePlanCheckFailures, type PlanCheckFailureRow } from '@/lib/hammer/planCheckFailures';

export function PlanCheckFailuresCard() {
  const q = useQuery({
    queryKey: ['plan-check-failures'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data, error } = await (supabase as never as { from: (t: string) => any }).from('plan_check_failures')
        .select('user_id,check_key,created_at,error').gte('created_at', since).order('created_at', { ascending: false }).limit(2000);
      if (error) throw error;
      return (data ?? []) as PlanCheckFailureRow[];
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Player plan checks that failed (hidden from players)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {q.error && <p className="text-destructive">Couldn't load the failure log.</p>}
        {q.data && summarizePlanCheckFailures(q.data, today).map(s => (
          <div key={s.check} className="space-y-1">
            <p>{s.line} {s.repeated && <Badge variant="destructive">Keeps happening</Badge>}</p>
            {Object.keys(s.byDay).length > 0 && (
              <p className="text-xs text-muted-foreground">{Object.entries(s.byDay).sort().map(([d, n]) => `${d}: ${n}`).join(' · ')}</p>
            )}
          </div>
        ))}
        {q.data?.slice(0, 5).map((r, i) => (
          <p key={i} className="text-xs text-muted-foreground">{r.created_at.slice(0, 16).replace('T', ' ')} · {r.check_key} · player {r.user_id.slice(0, 8)} · {r.error}</p>
        ))}
      </CardContent>
    </Card>
  );
}
