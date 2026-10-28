import { RecurringIssuesList } from '@/components/intelligence/RecurringIssuesList';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COMPARABLE_OUTCOME_LABEL } from "@/lib/intelligence/comparableOutcome";

/** "Your Do-this list": did you do it, and what happened when we re-checked. */
export function LearningLoopList() {
  const { user } = useAuth();
  const [recheckFailed, setRecheckFailed] = useState(false);
  const qc = useQueryClient();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const staff = isOwner || isAdmin;
  const key = ["intel-recs", user?.id, staff];
  useEffect(() => {
    setRecheckFailed(false);
    if (!user?.id) return;
    let active = true;
    void supabase.functions.invoke("intel-recheck").then(({ error }) => {
      if (!active) return;
      if (error) { setRecheckFailed(true); return; }
      void qc.invalidateQueries({ queryKey: ["intel-recs", user.id] });
    }).catch(() => { if (active) setRecheckFailed(true); });
    return () => { active = false; };
  }, [user?.id, qc]);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return [];
      // Owner/admin also see which principle produced the advice.
      const cols = staff
        ? "id, area, do_this, followed, outcome, created_at, followed_at, checked_at, principle_version_id, coaching_principle_versions(principle_id, version)"
        : "id, area, do_this, followed, outcome, created_at, followed_at, checked_at";
      const { data, error } = await (supabase as any).from("intelligence_recommendations")
        .select(cols)
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      // Results are filled only by a server re-check (analysis scores are locked from players).
      const rows = (data ?? []) as any[];
      return rows;
    },
  });
  if (isLoading) return null;
  if (isError) return (
    <section className="space-y-2" aria-label="Your Do-this list">
      <h3 className="text-sm font-semibold">Your "Do this" list</h3>
      <RecurringIssuesList title="Recurring findings to work on" />
      <p role="status" className="text-sm text-muted-foreground">We couldn't load your saved advice. Please try again later.</p>
    </section>
  );
  if (!data.length && !recheckFailed) return null;
  const mark = async (id: string, followed: boolean) => {
    await supabase.from("intelligence_recommendations")
      .update({ followed, followed_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };
  return (
    <section className="space-y-2" aria-label="Your Do-this list">
      <h3 className="text-sm font-semibold">Your "Do this" list</h3>
      {recheckFailed && <p role="status" className="text-sm text-muted-foreground">We couldn't re-check your advice. Your saved results are unchanged. Please try again later.</p>}
      {data.map((r) => (
        <Card key={r.id} className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">Area: {r.area}</p>
          <p className="font-medium">Do this: {r.do_this}</p>
          {staff && (r.coaching_principle_versions ? (
            <Link className="text-xs text-primary underline" to={`/owner/coaching-console?principle=${r.coaching_principle_versions.principle_id}`}>
              Which principle produced this advice (version {r.coaching_principle_versions.version})
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Principle: Not linked</p>
          ))}
          {r.followed == null ? (
            <div className="flex gap-2">
              <span className="self-center text-xs">Did you do it?</span>
              <Button size="sm" onClick={() => mark(r.id, true)}>Yes</Button>
              <Button size="sm" variant="outline" onClick={() => mark(r.id, false)}>Not yet</Button>
            </div>
          ) : (
            <p className="text-xs">
              Did it: {r.followed ? "Yes" : "Not yet"} · Result:{" "}
              {r.outcome
                ? COMPARABLE_OUTCOME_LABEL[r.outcome as keyof typeof COMPARABLE_OUTCOME_LABEL] ?? COMPARABLE_OUTCOME_LABEL.need_more_data
                : "Waiting for your next re-test"}
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}
