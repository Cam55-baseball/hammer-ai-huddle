/** Owner: AI cost per analysis and per plan (Plan 4 D). Costs are estimates from token counts. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { DashboardLayout } from "@/components/DashboardLayout";

const money = (n: number) => n == null || Number(n) < 0 ? "Unknown" : `$${Number(n).toFixed(4)}`;

export default function AiCostDashboard() {
  const { isOwner: staff, loading } = useOwnerAccess();
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["owner-ai-costs", days], enabled: staff,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ai_cost_summary", { _days: days });
      if (error) throw error;
      const { count, error: unknownError } = await supabase.from("ai_usage_log").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - days * 86400000).toISOString()).lt("estimated_cost_usd", 0);
      if (unknownError) throw unknownError;
      return { rows: data ?? [], unknown: count ?? 0 };
    },
  });
  if (loading) return <p className="p-6 text-sm">Loading…</p>;
  if (!staff) return <p className="p-6 text-sm text-muted-foreground">Owners only.</p>;
  const rows = q.data?.rows ?? [];
  const byPlan = new Map<string, { calls: number; cost: number }>();
  for (const r of rows) {
    const p = byPlan.get(r.plan) ?? { calls: 0, cost: 0 };
    p.calls += Number(r.calls); p.cost = p.cost < 0 || Number(r.total_cost) < 0 ? -1 : p.cost + Number(r.total_cost); byPlan.set(r.plan, p);
  }
  return (
    <DashboardLayout><div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">AI cost per analysis</h1>
      <p className="text-sm text-muted-foreground">
        Estimated from token counts (Gemini $0.30 in / $2.50 out per 1M tokens; OpenAI backup at its own rates). Check against the real bills.
      </p>
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>Last {d} days</Button>)}
      </div>
      {q.error && <p role="alert" className="text-sm text-destructive">Couldn't load analysis costs. Try again.</p>}
      {!!q.data?.unknown && <p className="text-sm text-muted-foreground">Unknown costs: {q.data.unknown} calls. Totals may be incomplete; compare with service bills.</p>}
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
    </div></DashboardLayout>
  );
}
