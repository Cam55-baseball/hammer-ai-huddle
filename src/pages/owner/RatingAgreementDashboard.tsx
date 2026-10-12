/** Owner: how often coaches agree with ratings, by test, metric, sport and position. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsStaff } from "@/lib/legal/useIsStaff";
import { agreementRates } from "@/lib/ratings/agreement";

export default function RatingAgreementDashboard() {
  const staff = useIsStaff();
  const q = useQuery({
    queryKey: ["owner-rating-agreements"], enabled: staff,
    queryFn: async () => (await supabase.from("rating_agreements").select("test_key, metric_key, sport, position, agree").limit(10000)).data ?? [],
  });
  if (!staff) return <p className="p-6 text-sm text-muted-foreground">Owners only.</p>;
  const groups = agreementRates((q.data ?? []) as any);
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Coach agreement with ratings</h1>
      <p className="text-sm text-muted-foreground">Lowest agreement first. Answers never change a rating.</p>
      {q.isLoading ? <p className="text-sm">Loading…</p> : groups.length === 0 ? <p className="text-sm text-muted-foreground">No answers yet.</p> : groups.map((g) => (
        <Card key={g.key}>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Test: {g.test_key} · Metric: {g.metric_key}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sport: {g.sport} · Position: {g.position} · Agree rate: {Math.round(g.rate * 100)}% ({g.agreed} of {g.total} answers)
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
