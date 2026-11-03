import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanRebuildJob = { id: string; reason: string; first_date: string; status: "running" | "done" | "failed"; message: string | null; created_at: string; finished_at: string | null; heartbeat_at?: string | null };
export type PlanRebuildView = "running" | "stalled" | "done" | "failed";

/** A running job that hasn't reported in this long shows a retry line instead of "Updating…". */
export const STALL_MS = 2 * 60_000;
const RECENT_MS = 10 * 60_000;

/** What the screen should say about the latest job (null = nothing to say). Pure; tested. */
export function planRebuildView(job: PlanRebuildJob | null, now: number): PlanRebuildView | null {
  if (!job) return null;
  if (job.status === "running") {
    const last = new Date(job.heartbeat_at ?? job.created_at).getTime();
    if (now - last > STALL_MS) return now - last > RECENT_MS * 6 ? null : "stalled";
    return "running";
  }
  return now - new Date(job.finished_at ?? job.created_at).getTime() < RECENT_MS ? job.status : null;
}

const REFRESH_KEYS = ["hammer-daily-plan", "wk-rx", "wk-plan-changes", "saved-block-day", "composed-plan-week", "season-status", "phase-state", "hammer-context-envelope", "calendar-projection", "coach-athlete-plan", "rest-day-choices", "composed-week"];

/** Latest server-side plan rebuild for the signed-in player (read-only status). */
export function usePlanRebuildJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["plan-rebuild-job", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("plan_rebuild_jobs")
        .select("id,reason,first_date,status,message,created_at,finished_at,heartbeat_at").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as PlanRebuildJob | null;
    },
    refetchInterval: (query) => planRebuildView(query.state.data as PlanRebuildJob | null, Date.now()) === "running" ? 3000 : false,
  });
  const job = q.data ?? null;
  const view = planRebuildView(job, Date.now());
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!job || view === "running") return;
    const tag = `${job.id}:${view}`;
    if (seen.current === null) { seen.current = tag; return; }
    if (seen.current === tag) return;
    seen.current = tag;
    for (const k of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [k] });
  }, [job, view, qc]);
  return { job: view ? job : null, view, updating: view === "running" };
}
