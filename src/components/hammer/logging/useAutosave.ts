/**
 * Autosave for activity logs: each change is stored on the device at once and
 * sent shortly after; blur, closing the pop-up (unmount) and backgrounding the
 * app send immediately. Offline values stay on the device until they sync.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { enqueue, installOutboxSync, pendingFor, sendJob, type OutboxJob } from "@/lib/logging/logOutbox";

export type SaveState = "idle" | "saving" | "saved" | "offline";

export function useAutosave(jobId: string, onSynced?: () => void) {
  const [state, setState] = useState<SaveState>(() => (pendingFor(jobId) ? "offline" : "idle"));
  const timer = useRef<number | null>(null);
  const synced = useRef(onSynced);
  synced.current = onSynced;
  const ids = useRef(new Set<string>([jobId]));

  const send = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const todo = [...ids.current].filter((id) => pendingFor(id));
    if (!todo.length) return;
    setState("saving");
    let ok = true;
    for (const id of todo) ok = (await sendJob(id)) && ok;
    setState(ok ? "saved" : "offline");
    if (ok) synced.current?.();
  }, []);

  const queue = useCallback((job: OutboxJob, delayMs = 600) => {
    ids.current.add(job.id);
    enqueue(job);
    setState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void send(); }, delayMs);
  }, [send]);

  useEffect(() => {
    installOutboxSync();
    const hide = () => { if (document.visibilityState === "hidden") void send(); };
    const online = () => void send();
    const synced = (e: Event) => { if (ids.current.has((e as CustomEvent).detail?.id) && ![...ids.current].some((id) => pendingFor(id))) setState("saved"); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", online);
    window.addEventListener("online", online);
    window.addEventListener("hm-log-synced", synced);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", online);
      window.removeEventListener("online", online);
      window.removeEventListener("hm-log-synced", synced);
      void send(); // pop-up closed: send what's left (it stays on the device if this fails)
    };
  }, [jobId, send]);

  return { state, queue, flush: send };
}

export function SavedIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Saved on this device — it will sync automatically";
  return <p data-autosave-state={state} aria-live="polite" className={`text-[11px] ${state === "offline" ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{state === "saved" ? "✓ " : ""}{text}</p>;
}
