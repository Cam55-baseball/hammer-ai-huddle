import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RestTimer } from "./RestTimer";
import { useConditioningRest } from "./ConditioningRestContext";
import type { BaseRep } from "../../../../supabase/functions/_shared/wic/runRest";

type Exercise = { id: string; name: string; rows: number; ready: boolean[]; restSeconds: number | null; bases?: BaseRep | null; enabled?: boolean; save: (row: number) => Promise<void> };
type Cursor = { exercise: number; exerciseId: string | null; row: number; restingUntil: number | null; restStartedAt: number | null; restSeconds: number | null };
const INITIAL: Cursor = { exercise: 0, exerciseId: null, row: 0, restingUntil: null, restStartedAt: null, restSeconds: null };
const Context = createContext<{
  active: boolean; cursor: Cursor; currentId?: string; register: (entry: Exercise) => () => void; refresh: () => void;
} | null>(null);

/** Focus is a cursor over mounted canonical log rows; it never creates a prescription or another log. */
export function FocusSession({ active, storageKey, children, onExit }: { active: boolean; storageKey: string; children: ReactNode; onExit: () => void }) {
  const entries = useRef(new Map<string, Exercise>());
  const [, update] = useState(0);
  const refresh = useCallback(() => update(n => n + 1), []);
  const register = useCallback((entry: Exercise) => { entries.current.set(entry.id, entry); refresh(); return () => { entries.current.delete(entry.id); refresh(); }; }, [refresh]);
  const [cursor, setCursor] = useState<Cursor>(() => {
    try { return { ...INITIAL, ...JSON.parse(sessionStorage.getItem(storageKey) ?? "null") }; } catch { return INITIAL; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingManualRest, setAwaitingManualRest] = useState(false);
  const conditioning = useConditioningRest();
  const all = [...entries.current.values()];
  const current = cursor.exerciseId ? all.find(entry => entry.id === cursor.exerciseId) : all[cursor.exercise];
  useEffect(() => {
    if (current && cursor.exerciseId == null) setCursor(prior => ({ ...prior, exerciseId: current.id }));
  }, [current?.id, cursor.exerciseId]);
  const advance = useCallback(() => setCursor(prior => {
    const all = [...entries.current.values()];
    const index = prior.exerciseId ? all.findIndex(entry => entry.id === prior.exerciseId) : prior.exercise;
    const exercise = all[index];
    if (!exercise) return prior;
    const moreRows = prior.row + 1 < exercise.rows;
    const nextIndex = moreRows ? index : index + 1;
    return { ...INITIAL, exercise: nextIndex, exerciseId: all[nextIndex]?.id ?? null, row: moreRows ? prior.row + 1 : 0 };
  }), []);
  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(cursor)); }, [cursor, storageKey]);
  useEffect(() => {
    if (!active || cursor.restingUntil == null) return;
    const check = () => { if (Date.now() >= (cursor.restingUntil ?? Infinity)) advance(); };
    check(); const timer = window.setInterval(check, 100);
    return () => window.clearInterval(timer);
  }, [active, cursor.restingUntil, advance]);
  const save = async (exit: boolean) => {
    if (!current || busy) { if (exit) onExit(); return; }
    setBusy(true); setError(null); setAwaitingManualRest(false);
    try {
      await current.save(cursor.row);
      if (exit) { onExit(); return; }
      let seconds = current.restSeconds;
      if (current.bases) {
        const { conditioningRestAfterRep } = await import("../../../../supabase/functions/_shared/wic/runRest");
        seconds = conditioningRestAfterRep(conditioning.state.bases, current.bases).seconds;
        conditioning.finishRep(current.bases);
      }
      if (seconds != null && seconds > 0) {
        const now = Date.now();
        setCursor(prior => ({ ...prior, restStartedAt: now, restSeconds: seconds, restingUntil: now + seconds * 1000 }));
      } else if (seconds === 0) advance();
      else { setAwaitingManualRest(true); setError("Rest time is not specified for this activity. Finish your rest, then continue."); }
    } catch { setError("Couldn't save this set. Your entries are still here; try again."); }
    finally { setBusy(false); }
  };
  const skip = async () => {
    if (!current || busy) return;
    setBusy(true); setError(null); setAwaitingManualRest(false);
    try { await current.save(cursor.row); advance(); }
    catch { setError("Couldn't save your entries. Try again before skipping."); }
    finally { setBusy(false); }
  };
  return <Context.Provider value={{ active, cursor, currentId: current?.id, register, refresh }}>
    {active && <section data-focus-session className="mb-3 space-y-2 border-b border-border pb-3">
      <h3 className="text-base font-semibold">{current ? `${current.name} · Set ${cursor.row + 1} of ${current.rows}` : "End of guided sets"}</h3>
      {cursor.restingUntil != null && <RestTimer key={cursor.restStartedAt} label="Rest before the next set" seconds={cursor.restSeconds} initialStartedAt={cursor.restStartedAt} managed />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {current && cursor.restingUntil == null && <>
          <Button size="sm" disabled={busy || !current.ready[cursor.row]} onClick={() => void save(false)}>Next</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void skip()}>Skip</Button>
          {awaitingManualRest && <Button size="sm" variant="outline" onClick={() => { setError(null); setAwaitingManualRest(false); advance(); }}>Rest finished</Button>}
        </>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(true)}>Save &amp; exit</Button>
      </div>
    </section>}
    {children}
  </Context.Provider>;
}

export function useFocusExercise(entry: Exercise) {
  const context = useContext(Context);
  const latest = useRef(entry); latest.current = entry;
  const register = context?.register;
  useEffect(() => {
    if (!register || entry.enabled === false) return;
    const proxy = { ...entry, get ready() { return latest.current.ready; }, save: (row: number) => latest.current.save(row) };
    return register(proxy);
  }, [register, entry.id, entry.rows, entry.restSeconds, entry.bases, entry.name, entry.enabled]);
  const signature = entry.ready.join(",");
  const refresh = context?.refresh;
  useEffect(() => { refresh?.(); }, [signature, refresh]);
  return { active: context?.active ?? false, visible: !context?.active || context.currentId === entry.id, row: context?.cursor.row ?? 0, resting: context?.cursor.restingUntil != null };
}

export function useFocusState() {
  const context = useContext(Context);
  return { active: context?.active ?? false, currentId: context?.currentId, row: context?.cursor.row ?? 0 };
}

export function FocusDurationTimer({ target, onDone }: { target: number; onDone: (seconds: number) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (start == null) return;
    const tick = () => {
      const at = Date.now(); setNow(at);
      if (!done.current && (at - start) / 1000 >= target) { done.current = true; setFinished(true); setStart(null); onDone(target); }
    };
    const timer = window.setInterval(tick, 10); return () => window.clearInterval(timer);
  }, [start, target, onDone]);
  return <div className="flex items-center gap-3" data-focus-duration>
    <Button size="sm" variant="outline" disabled={start != null || finished} onClick={() => { done.current = false; const at = Date.now(); setNow(at); setStart(at); }}>{finished ? "Timer done" : "Start timer"}</Button>
    <span className="font-mono tabular-nums">{(finished ? 0 : Math.max(0, target - (start == null ? 0 : (now - start) / 1000))).toFixed(2)} s</span>
  </div>;
}