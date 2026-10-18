import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OUTCOME_LABEL, type Outcome } from "@/lib/intelligence/learningLoop";

/** "Your Do-this list": did you do it, and what happened when we re-checked. */
export function LearningLoopList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["intel-recs", user?.id];
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void supabase.functions.invoke("intel-recheck").then(({ error }) => {
      if (active && !error) void qc.invalidateQueries({ queryKey: ["intel-recs", user.id] });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user?.id, qc]);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("intelligence_recommendations")
        .select("id, area, do_this, followed, outcome, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      // Results are filled only by a server re-check (analysis scores are locked from players).
      const rows = data ?? [];
      return rows;
    },
  });
  if (isLoading) return null;
  if (isError) return (
    <section className="space-y-2" aria-label="Your Do-this list">
      <h3 className="text-sm font-semibold">Your "Do this" list</h3>
      <p role="status" className="text-sm text-muted-foreground">We couldn't load your saved advice. Please try again later.</p>
    </section>
  );
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
