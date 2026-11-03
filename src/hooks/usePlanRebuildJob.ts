import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanRebuildJob = { id: string; reason: string; first_date: string; status: "running" | "done" | "failed"; message: string | null; created_at: string; finished_at: string | null };

const REFRESH_KEYS = ["hammer-daily-plan", "wk-rx", "wk-plan-changes", "saved-block-day", "composed-plan-week", "season-status", "phase-state", "hammer-context-envelope", "calendar-projection", "coach-athlete-plan"];

/** Latest server-side plan rebuild for the signed-in player (read-only status). */
export function usePlanRebuildJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["plan-rebuild-job", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("plan_rebuild_jobs")
        .select("id,reason,first_date,status,message,created_at,finished_at").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as PlanRebuildJob | null;
    },
    refetchInterval: (query) => (query.state.data as PlanRebuildJob | null)?.status === "running" ? 3000 : false,
  });
  const job = q.data ?? null;
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!job || job.status === "running") return;
    const tag = `${job.id}:${job.status}`;
    if (seen.current === null) { seen.current = tag; return; }
    if (seen.current === tag) return;
    seen.current = tag;
    for (const k of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [k] });
  }, [job, qc]);
  // Only a recent job is news; an old finished one stays quiet.
  const recent = !!job && (job.status === "running" || Date.now() - new Date(job.finished_at ?? job.created_at).getTime() < 10 * 60_000);
  return { job: recent ? job : null, updating: recent && job?.status === "running" };
}
