/**
 * Autosave outbox for activity logs. Every change is written to the device
 * first (localStorage, latest value per log wins), then sent. A failed or
 * offline send stays on the device and is retried on reconnect, on resume and
 * at the next app start. Nothing is removed until the backend accepts it.
 */
import { supabase } from "@/integrations/supabase/client";
import { setTaskCompletion, type TaskWrite } from "@/lib/hammer/taskCompletionWrite";
import { markPrescriptionDone, type MarkableRx } from "@/lib/wic/execution/liftCompletion";
import { writeExerciseLog, type ExerciseLogPayload } from "@/lib/logging/writeExerciseLog";

const KEY = "hm_log_outbox_v1";

export type OutboxJob =
  | { kind: "exercise_log"; id: string; userId: string; payload: ExerciseLogPayload; credit: MarkableRx | null; at: number }
  | { kind: "task"; id: string; userId: string; planDate: string; seed: TaskWrite; completed: boolean; at: number };

function read(): Record<string, OutboxJob> {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(all: Record<string, OutboxJob>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full: in-memory job still sent below */ }
}

export function pendingJobs(): OutboxJob[] { return Object.values(read()).sort((a, b) => a.at - b.at); }
export function pendingFor(id: string): OutboxJob | null { return read()[id] ?? null; }

export function enqueue(job: OutboxJob) {
  const all = read();
  all[job.id] = job;
  write(all);
}

export type Sender = (job: OutboxJob) => Promise<string | null>;

export const defaultSender: Sender = async (job) => {
  if (job.kind === "task") return setTaskCompletion(job.userId, job.planDate, job.seed, job.completed);
  const err = await writeExerciseLog(supabase, job.userId, job.payload);
  if (err) return err;
  if (job.credit) {
    const e2 = await markPrescriptionDone(job.credit, job.userId);
    if (e2) return e2;
  }
  return null;
};

const inflight = new Map<string, Promise<boolean>>();

/** Send one job; on success remove it only if no newer value replaced it. */
export async function sendJob(id: string, sender: Sender = defaultSender): Promise<boolean> {
  const running = inflight.get(id);
  if (running) { await running; }
  const job = read()[id];
  if (!job) return true;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const p = (async () => {
    try {
      const err = await sender(job);
      if (err) return false;
      const all = read();
      if (all[id]?.at === job.at) { delete all[id]; write(all); }
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("hm-log-synced", { detail: { id, kind: job.kind } }));
      return true;
    } catch { return false; }
  })();
  inflight.set(id, p);
  const ok = await p;
  inflight.delete(id);
  return ok;
}

export async function flushOutbox(sender: Sender = defaultSender): Promise<number> {
  let sent = 0;
  for (const j of pendingJobs()) if (await sendJob(j.id, sender)) sent += 1;
  return sent;
}

let installed = false;
/** Retry everything on reconnect, resume and start. Safe to call repeatedly. */
export function installOutboxSync() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const go = () => { void flushOutbox(); };
  window.addEventListener("online", go);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") go(); });
  setTimeout(go, 1500);
}
