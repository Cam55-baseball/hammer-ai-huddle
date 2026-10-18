/** Owner: how often coaches agree with ratings, by test, metric, sport and position. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { agreementRates } from "@/lib/ratings/agreement";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function RatingAgreementDashboard() {
  const { isOwner: staff, loading } = useOwnerAccess();
  const q = useQuery({
    queryKey: ["owner-rating-agreements"], enabled: staff,
    queryFn: async () => {
      const { data, error } = await supabase.from("rating_agreements")
        .select("test_key, metric_key, sport, position, agree, note, created_at")
        .order("created_at", { ascending: false }).limit(10000);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (loading) return <p className="p-6 text-sm">Loading…</p>;
  if (!staff) return <p className="p-6 text-sm text-muted-foreground">Owners only.</p>;
  const groups = agreementRates((q.data ?? []) as any);
  return (
    <DashboardLayout><div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Coach agreement with ratings</h1>
      <p className="text-sm text-muted-foreground">Lowest agreement first. Answers never change a rating.</p>
      {q.error && <p className="text-sm text-destructive">Couldn't load coach answers. Try again.</p>}
      {q.isLoading ? <p className="text-sm">Loading…</p> : groups.length === 0 ? <p className="text-sm text-muted-foreground">No answers yet.</p> : groups.map((g) => (
        <Card key={g.key}>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Test: {g.test_key} · Metric: {g.metric_key}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sport: {g.sport} · Position: {g.position} · Agree rate: {Math.round(g.rate * 100)}% ({g.agreed} of {g.total} answers)
          </CardContent>
        </Card>
      ))}
      <section className="space-y-2">
        <h2 className="font-semibold">Recent notes</h2>
        {(q.data ?? []).filter((r) => r.note?.trim()).slice(0, 20).map((r, i) => (
          <div key={i} className="border-b py-2 text-sm">
            <p className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · Test: {r.test_key} · Metric: {r.metric_key} · Sport: {r.sport} · Position: {r.position ?? "Not recorded"} · {r.agree ? "Agreed" : "Disagreed"}</p>
            <p className="break-words">{r.note}</p>
          </div>
        ))}
        {!q.isLoading && !(q.data ?? []).some((r) => r.note?.trim()) && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </section>
    </div></DashboardLayout>
  );
}
