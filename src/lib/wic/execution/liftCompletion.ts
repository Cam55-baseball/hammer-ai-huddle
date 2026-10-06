/**
 * Lift completion — the one place the app decides what counts as a finished
 * lift and writes the "done" mark. The Done button, the checkbox and a full
 * Log sheet all go through here so they record exactly the same thing.
 */
import { supabase } from "@/integrations/supabase/client";
import { setTaskCompletion } from "@/lib/hammer/taskCompletionWrite";

/** Statuses a wk_prescriptions row can carry. Unknown values read as planned. */
export type WkRowStatus = "planned" | "pending" | "completed" | "skipped" | "missed";

/** Days after the lift's own date during which a missed lift can still be changed. */
export const MISSED_EDIT_WINDOW_DAYS = 7;

/** Reps-like value of one logged round (reps, throws or contacts). */
function repsOf(round: Record<string, unknown>): number | null {
  for (const k of ["reps", "throws", "contacts"]) {
    const v = round[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/**
 * A log is complete only when every prescribed set carries a rep count.
 * `requiredRounds` already doubles for per-side work (L and R each count).
 */
export function isFullLiftLog(
  rounds: ReadonlyArray<Record<string, unknown>>,
  requiredRounds: number,
): boolean {
  if (!Number.isFinite(requiredRounds) || requiredRounds <= 0) return false;
  const filled = rounds.filter((r) => repsOf(r) != null).length;
  return filled >= requiredRounds;
}

/** Local YYYY-MM-DD for "today" on this device. */
function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whether a missed lift dated `planDate` can still be changed to Done or Cut short. */
export function missedStillEditable(planDate: string, today: string = localToday()): boolean {
  const a = Date.parse(`${planDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return (b - a) / 86_400_000 <= MISSED_EDIT_WINDOW_DAYS;
}

export interface MarkableRx {
  id: string;
  plan_date: string;
  slot: string;
  movement_name: string;
  movement_slug: string;
}

/**
 * Mark one prescription done: row status → completed and the matching
 * checklist row → completed. Returns an error message, or null on success.
 */
export async function markPrescriptionDone(rx: MarkableRx, userId: string): Promise<string | null> {
  const { error } = await supabase
    .from("wk_prescriptions" as any)
    .update({ status: "completed" })
    .eq("id", rx.id)
    .eq("user_id", userId);
  if (error) return error.message || "Could not save";
  const taskErr = await setTaskCompletion(userId, rx.plan_date, {
    taskId: rx.id,
    source: "wk_prescription",
    sourceRef: rx.slot,
    side: null,
    payload: { name: rx.movement_name, slug: rx.movement_slug, side: null },
  }, true);
  if (taskErr) console.warn("[lift-completion] checklist mirror failed", taskErr);
  return null;
}
