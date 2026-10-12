import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const words = (k?: string | null) => (k ? k.replace(/[_.-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "Not entered");
const pct = (w?: { set: number; done: number }) => (w && w.set > 0 ? Math.round((w.done / w.set) * 100) : null);

/** Plan 4 D — running weekly summary across a coach's connected players. Evidence-labeled; never claims cause. */
export function CoachWeeklySummary() {
  const q = useQuery({
    queryKey: ["coach-weekly-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("coach_weekly_summary");
      if (error) throw error;
      return data as any;
    },
  });
  if (q.isLoading || q.isError || !q.data) return null;
  const s = q.data;
  const now = pct(s.this_week), before = pct(s.last_week);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">This week across your players</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Players: {s.players} · Dates: {s.from} to {s.to}</p>
        {s.players === 0 ? <p className="text-muted-foreground">No connected players yet.</p> : (
          <>
            <p>
              Work done vs set: {now === null ? "Not enough data" : `${now}% (${s.this_week.done} of ${s.this_week.set} exercises)`}
              {" · "}Week before: {before === null ? "Not enough data" : `${before}%`}
            </p>
            <div>
              <p className="font-medium">Most common issues in video analyses (last 7 days)</p>
              {s.issues.length === 0 ? <p className="text-muted-foreground">Not enough data</p> : (
                <ul className="space-y-1">
                  {s.issues.map((i: any) => (
                    <li key={i.fault_key}>
                      Issue: {words(i.fault_key)} · Players: {i.players} · Times seen: {i.times}
                      <br /><span className="text-muted-foreground">What to learn to help them: {words(i.correction_key)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">From logged workouts and saved video analyses only. Counts show patterns, not causes.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
