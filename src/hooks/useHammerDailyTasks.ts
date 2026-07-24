/**
 * useHammerDailyTasks — persistent per-drill checklist for Hammer Today cards.
 *
 * Backed by `public.hammer_daily_task_completions`. Task IDs are:
 *   - Wk prescription rows: the prescription id (source: "wk_prescription")
 *   - Block drills: `${modality}:${slug|slugified name}` (source: "block_drill")
 *
 * The hook exposes optimistic toggle / bulk complete / bulk reset helpers.
 * Interpretive UI layer — never authors organism truth.
 */
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TaskRow {
  id: string;
  user_id: string;
  plan_date: string;
  task_id: string;
  source: "wk_prescription" | "block_drill";
  source_ref: string;
  payload: Record<string, unknown>;
  completed: boolean;
  completed_at: string | null;
}

export interface TaskSeed {
  taskId: string;
  source: "wk_prescription" | "block_drill";
  sourceRef: string;
  payload?: Record<string, unknown>;
}

export function slugifyDrillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function makeBlockTaskId(modality: string, slugOrName: string): string {
  const s = slugOrName.startsWith("slug:") ? slugOrName.slice(5) : slugifyDrillName(slugOrName);
  return `${modality}:${s || "drill"}`;
}

export function useHammerDailyTasks(planDate: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["hammer-daily-tasks", user?.id, planDate];

  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hammer_daily_task_completions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("plan_date", planDate);
      if (error) throw error;
      return ((data ?? []) as unknown as TaskRow[]);
    },
    staleTime: 30_000,
  });

  const byId = new Map<string, TaskRow>();
  for (const r of query.data ?? []) byId.set(r.task_id, r);

  const isDone = useCallback((taskId: string) => !!byId.get(taskId)?.completed, [byId]);

  const upsertMut = useMutation({
    mutationFn: async ({ seed, completed }: { seed: TaskSeed; completed: boolean }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("hammer_daily_task_completions" as any)
        .upsert(
          {
            user_id: user.id,
            plan_date: planDate,
            task_id: seed.taskId,
            source: seed.source,
            source_ref: seed.sourceRef,
            payload: seed.payload ?? {},
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,plan_date,task_id" },
        );
      if (error) throw error;
    },
    onMutate: async ({ seed, completed }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<TaskRow[]>(queryKey) ?? [];
      const filtered = prev.filter((r) => r.task_id !== seed.taskId);
      const next: TaskRow[] = [
        ...filtered,
        {
          id: `optimistic-${seed.taskId}`,
          user_id: user?.id ?? "",
          plan_date: planDate,
          task_id: seed.taskId,
          source: seed.source,
          source_ref: seed.sourceRef,
          payload: seed.payload ?? {},
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
      ];
      qc.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      console.warn("[hammer-daily-tasks] toggle failed", err);
      toast.error("Couldn't save — try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const toggleTask = useCallback(
    (seed: TaskSeed, completed: boolean) => upsertMut.mutate({ seed, completed }),
    [upsertMut],
  );

  const bulkSetMut = useMutation({
    mutationFn: async ({ seeds, completed }: { seeds: TaskSeed[]; completed: boolean }) => {
      if (!user?.id || seeds.length === 0) return;
      const rows = seeds.map((s) => ({
        user_id: user.id,
        plan_date: planDate,
        task_id: s.taskId,
        source: s.source,
        source_ref: s.sourceRef,
        payload: s.payload ?? {},
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      }));
      const { error } = await supabase
        .from("hammer_daily_task_completions" as any)
        .upsert(rows, { onConflict: "user_id,plan_date,task_id" });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const bulkSet = useCallback(
    (seeds: TaskSeed[], completed: boolean) => bulkSetMut.mutateAsync({ seeds, completed }),
    [bulkSetMut],
  );

  const countDone = useCallback(
    (sourceRef: string, taskIds: string[]) =>
      taskIds.filter((id) => byId.get(id)?.completed).length,
    [byId],
  );

  return {
    isLoading: query.isLoading,
    isDone,
    toggleTask,
    bulkSet,
    countDone,
    byId,
  };
}
