/** Owner: AI cost per analysis and per plan (Plan 4 D). Costs are estimates from token counts. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsStaff } from "@/lib/legal/useIsStaff";

const money = (n: number) => `$${Number(n).toFixed(4)}`;

export default function AiCostDashboard() {
  const staff = useIsStaff();
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["owner-ai-costs", days], enabled: staff,
    queryFn: async () => ((await (supabase as any).rpc("ai_cost_summary", { _days: days })).data ?? []) as any[],
  });
  if (!staff) return <p className="p-6 text-sm text-muted-foreground">Owners only.</p>;
  const rows = q.data ?? [];
  const byPlan = new Map<string, { calls: number; cost: number }>();
  for (const r of rows) {
    const p = byPlan.get(r.plan) ?? { calls: 0, cost: 0 };
    p.calls += Number(r.calls); p.cost += Number(r.total_cost); byPlan.set(r.plan, p);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">AI cost per analysis</h1>
      <p className="text-sm text-muted-foreground">
        Estimated from token counts (Gemini $0.30 in / $2.50 out per 1M tokens; OpenAI backup at its own rates). Check against the real bills.
      </p>
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>Last {d} days</Button>)}
      </div>
      {q.isLoading ? <p className="text-sm">Loading…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No analyses logged yet.</p> : (
        <>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm">By plan</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              {[...byPlan].map(([plan, v]) => (
                <p key={plan}>Plan: {plan} · Analyses: {v.calls} · Total cost: {money(v.cost)} · Per analysis: {money(v.cost / v.calls)}</p>
              ))}
            </CardContent>
          </Card>
          {rows.map((r, i) => (
            <Card key={i}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">Analysis: {r.analysis_type ?? r.function_name} · Plan: {r.plan}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Service: {r.provider} · Model: {r.model ?? "Not reported"} · Analyses: {r.calls} · Avg tokens in/out: {r.avg_input}/{r.avg_output} · Avg cost: {money(r.avg_cost)} · Total: {money(r.total_cost)}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
