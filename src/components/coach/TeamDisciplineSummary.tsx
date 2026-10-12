import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type Row = { athlete_id: string; name: string; set_7: number | null; done_7: number | null; set_28: number | null; done_28: number | null; days_set_28: number; days_logged_28: number; missed_28: number };
const pct = (d: number | null, s: number | null) => (!s ? "Not enough data" : `${Math.round(((d ?? 0) / s) * 100)}%`);

/** Plan 4 C — team (coach) or organization summary of work done vs set. Server-checked: connected players only. */
export function TeamDisciplineSummary({ orgId }: { orgId?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-discipline", orgId ?? "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("team_discipline_summary", orgId ? { _org: orgId } : {});
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  const rows = data ?? [];
  const s28 = rows.reduce((a, r) => a + (r.set_28 ?? 0), 0);
  const d28 = rows.reduce((a, r) => a + (r.done_28 ?? 0), 0);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold">{orgId ? "Organization" : "Team"} discipline — last 28 days</h3>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : error ? <p className="text-sm text-muted-foreground">Could not load.</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground">No connected players yet.</p> : (
        <>
          <p className="text-sm">Whole group, work done vs set: {pct(d28, s28)} · Players: {rows.length}</p>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.athlete_id} className="py-2 text-sm">
                <Link to={`/coach/athlete/${r.athlete_id}`} className="font-medium underline-offset-2 hover:underline">{r.name}</Link>
                <div className="text-xs text-muted-foreground">
                  Done vs set: 7 days {pct(r.done_7, r.set_7)} · 28 days {pct(r.done_28, r.set_28)} · Missed days: {r.missed_28} · Logging consistency: {r.days_set_28 ? `${Math.round((r.days_logged_28 / r.days_set_28) * 100)}%` : "Not enough data"}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Source: each player's plan and saved workout logs, days before today.</p>
        </>
      )}
    </Card>
  );
}
