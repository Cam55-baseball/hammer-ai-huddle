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
import { addToNextAppropriateSession, candidatePlanDates, matchCatalogDrill } from "@/lib/intelligence/addDoThisToPlan";

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
        ? "id, area, do_this, drill, source_video_id, followed, outcome, created_at, followed_at, checked_at, principle_version_id, coaching_principle_versions(principle_id, version)"
        : "id, area, do_this, drill, source_video_id, followed, outcome, created_at, followed_at, checked_at";
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
          <DoThisDrill text={r.do_this} drill={r.drill} />
          <AddDoThisButton drill={r.drill} text={r.do_this} area={r.area} videoId={r.source_video_id ?? null} />
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

/** Drill instructions in a drop-down, same as drills elsewhere. */
function DoThisDrill({ text, drill }: { text: string; drill?: { title?: string | null; reps_sets?: string | null; purpose?: string | null; steps?: string[]; cue?: string | null } | null }) {
  const hasHow = !!(drill && (drill.purpose || drill.steps?.length || drill.cue));
  return (
    <details className="rounded-md border border-border p-2" data-do-this-drill>
      <summary className="cursor-pointer font-medium">Do this: {drill?.title ?? text}{drill?.reps_sets ? ` · ${drill.reps_sets}` : ""}</summary>
      <div className="mt-2 space-y-1 text-sm">
        {drill?.purpose && <p><span className="font-medium">Why: </span>{drill.purpose}</p>}
        {!!drill?.steps?.length && <ol className="list-decimal space-y-0.5 pl-5">{drill.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
        {drill?.cue && <p><span className="font-medium">Cue: </span>{drill.cue}</p>}
        {!hasHow && <p className="text-muted-foreground">How-to steps show here for advice from your next analysis.</p>}
      </div>
    </details>
  );
}

/** Adds the drill to today, or the very next session of the same kind (server checks category and safety). */
function AddDoThisButton({ drill, text, area, videoId }: { drill: any; text: string; area: string; videoId: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const sport = localStorage.getItem("selectedSport") === "softball" ? "softball" : "baseball";
  const match = matchCatalogDrill(drill ?? { title: text }, area, sport);
  // No clip to link or no catalog drill matched by tags: no button (never faked).
  if (!videoId || !match) return null;
  const drillId = match.id;
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const { date, result } = await addToNextAppropriateSession(candidatePlanDates(new Date()), async (planDate) => {
        const { data, error } = await supabase.functions.invoke("plan-swap", { body: { action: "analysis_drill", videoId, drillId, sport, planDate } });
        if (error || data?.error) { const body = await (error as any)?.context?.clone?.().json?.().catch(() => null); return { error: data?.error ?? body?.error ?? "this drill could not be added." }; }
        return data;
      });
      if (!date) setMsg(`Not added: ${result.error ?? "no upcoming session of this kind yet."} Nothing was saved.`);
      else if (result.saved) { setMsg(`Added ${match.name} to your ${date === candidatePlanDates(new Date())[0] ? "work today" : `session on ${date}`}.`); await qc.invalidateQueries({ predicate: (q) => /^(saved-block-day|wk-rx)/.test(String(q.queryKey[0])) }); }
      else setMsg(`Your session on ${date} needs a safety check first. Open it from the analysis report.`);
    } finally { setBusy(false); }
  };
  return <div className="space-y-1"><Button size="sm" variant="outline" disabled={busy} onClick={run}>{busy ? "Checking…" : "Add to today's work"}</Button>{msg && <p role="status" className="text-xs">{msg}</p>}</div>;
}
