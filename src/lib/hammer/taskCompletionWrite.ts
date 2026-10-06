/**
 * Write a checklist row in `hammer_daily_task_completions`.
 *
 * The table's uniqueness is an expression index (side NULL counts as ''), which
 * the REST `on_conflict` option cannot target — every upsert using it was
 * refused with a 400, so no check-off was ever saved. This finds the existing
 * row and updates it, or inserts a new one.
 */
import { supabase } from "@/integrations/supabase/client";

export interface TaskWrite {
  taskId: string;
  source: string;
  sourceRef: string;
  side?: "L" | "R" | null;
  payload?: Record<string, unknown>;
}

/** Returns an error message, or null on success. */
export async function setTaskCompletion(
  userId: string,
  planDate: string,
  seed: TaskWrite,
  completed: boolean,
): Promise<string | null> {
  const side = seed.side ?? null;
  let q = (supabase as any)
    .from("hammer_daily_task_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .eq("task_id", seed.taskId);
  q = side ? q.eq("side", side) : q.is("side", null);
  const { data: existing, error: readErr } = await q.limit(1).maybeSingle();
  if (readErr) return readErr.message || "Could not read checklist";
  const fields = {
    source: seed.source,
    source_ref: seed.sourceRef,
    payload: seed.payload ?? {},
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
  const { error } = existing?.id
    ? await (supabase as any).from("hammer_daily_task_completions").update(fields).eq("id", existing.id)
    : await (supabase as any).from("hammer_daily_task_completions").insert({
        user_id: userId,
        plan_date: planDate,
        task_id: seed.taskId,
        side,
        ...fields,
      });
  return error ? error.message || "Could not save" : null;
}
