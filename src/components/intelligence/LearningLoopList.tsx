import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { judgeOutcome, OUTCOME_LABEL, type Outcome } from "@/lib/intelligence/learningLoop";

/** "Your Do-this list": did you do it, and what happened when we re-checked. */
export function LearningLoopList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["intel-recs", user?.id];
  const { data = [] } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("intelligence_recommendations")
        .select("id, area, do_this, followed, outcome, created_at, baseline_value")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      const rows = data ?? [];
      // Re-check: the first scored analysis in the same area after the advice was given.
      for (const r of rows) {
        if (!r.followed || r.outcome || r.baseline_value == null) continue;
        const { data: v } = await supabase.from("videos").select("efficiency_score, created_at")
          .eq("user_id", user!.id).eq("module", r.area.toLowerCase()).not("efficiency_score", "is", null)
          .gt("created_at", r.created_at).order("created_at").limit(1);
        const recheck = v?.[0]?.efficiency_score ?? null;
        const outcome = judgeOutcome(Number(r.baseline_value), recheck);
        if (!outcome) continue;
        const { error: e } = await supabase.from("intelligence_recommendations")
          .update({ recheck_value: recheck, outcome, checked_at: new Date().toISOString() }).eq("id", r.id);
        if (!e) r.outcome = outcome;
      }
      return rows;
    },
  });
  if (!data.length) return null;
  const mark = async (id: string, followed: boolean) => {
    await supabase.from("intelligence_recommendations")
      .update({ followed, followed_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };
  return (
    <section className="space-y-2" aria-label="Your Do-this list">
      <h3 className="text-sm font-semibold">Your "Do this" list</h3>
      {data.map((r) => (
        <Card key={r.id} className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">Area: {r.area}</p>
          <p className="font-medium">Do this: {r.do_this}</p>
          {r.followed == null ? (
            <div className="flex gap-2">
              <span className="self-center text-xs">Did you do it?</span>
              <Button size="sm" onClick={() => mark(r.id, true)}>Yes</Button>
              <Button size="sm" variant="outline" onClick={() => mark(r.id, false)}>Not yet</Button>
            </div>
          ) : (
            <p className="text-xs">
              Did it: {r.followed ? "Yes" : "Not yet"} · Result:{" "}
              {r.outcome ? OUTCOME_LABEL[r.outcome as Outcome] : "Waiting for your next re-test"}
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}
