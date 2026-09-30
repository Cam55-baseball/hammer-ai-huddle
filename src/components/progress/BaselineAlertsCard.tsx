/**
 * Personal-range alerts from the athlete ledger. Coach language, no numbers.
 * Only measurements with an athlete_label are shown; everything else keeps
 * recording silently until it is declared.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { alertSentence } from "@/lib/biomech/baseline/athleteBaseline";

interface AlertRow { id: string; metric_key: string; kind: "outlier" | "drift"; direction: "below" | "above"; created_at: string }

export function BaselineAlertsCard() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["baseline-alerts"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const [{ data: alerts }, { data: defs }] = await Promise.all([
        supabase.from("athlete_baseline_alerts" as never).select("id, metric_key, kind, direction, created_at")
          .eq("user_id", auth.user.id).is("dismissed_at", null).order("created_at", { ascending: false }).limit(10),
        supabase.from("measurement_definitions" as never).select("metric_key, athlete_label"),
      ]) as unknown as [{ data: AlertRow[] | null }, { data: { metric_key: string; athlete_label: string | null }[] | null }];
      const label = new Map((defs ?? []).filter((d) => d.athlete_label).map((d) => [d.metric_key, d.athlete_label as string]));
      return (alerts ?? []).filter((a) => label.has(a.metric_key)).map((a) => ({ ...a, text: alertSentence(label.get(a.metric_key)!, a.kind, a.direction) }));
    },
  });
  if (!data.length) return null;
  const dismiss = async (id: string) => {
    await supabase.from("athlete_baseline_alerts" as never).update({ dismissed_at: new Date().toISOString() } as never).eq("id", id);
    qc.invalidateQueries({ queryKey: ["baseline-alerts"] });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Compared to your normal</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {data.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
            <p className="text-sm text-foreground">{a.text}</p>
            <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}>Got it</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
