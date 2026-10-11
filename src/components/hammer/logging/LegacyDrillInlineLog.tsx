import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { QueryClientContext } from "@tanstack/react-query";
import { useContext } from "react";
import { usePocketLogHost } from "../cards/PocketCard";
import { RestTimer, sprintRestSeconds } from "../cards/RestTimer";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { legacyDrillLogSpec } from "@/lib/hammer/prescription/legacyDrillLog";
import { useOptionalAuth } from "@/hooks/useAuth";
import type { TaskWrite } from "@/lib/hammer/taskCompletionWrite";
import { AUTO_STATUS_LABEL, autoStatus } from "@/lib/logging/autoCompletion";
import { formatTime, timeKindFor } from "@/lib/logging/timeEntry";
import { TimeField } from "./TimeField";
import { SavedIndicator, useAutosave } from "./useAutosave";

type Draft = Record<string, string>[];
const TOUCHED = "_t";

/**
 * Legacy plan-block drill log. Entries autosave (device first, then sync);
 * completion is automatic from the entries; Skip is the only explicit choice.
 */
export function LegacyDrillInlineLog({
  modality, name, dosage, storageKey, completed, onSave, onOutcome, taskSync,
}: {
  modality: string;
  name: string;
  dosage: string;
  storageKey: string;
  completed: boolean;
  /** Called after each change with the log (for callers without taskSync). */
  onSave?: (log: Record<string, unknown>) => void;
  onOutcome?: (outcome: "completed" | "skipped" | "cut_short", how_hard: number | null) => void;
  /** Checklist row this log saves to, through the offline-safe outbox. */
  taskSync?: { planDate: string; seed: TaskWrite } | null;
}) {
  const logHost = usePocketLogHost();
  const { user } = useOptionalAuth();
  const qc = useContext(QueryClientContext) ?? null;
  const spec = useMemo(() => legacyDrillLogSpec(modality, name, dosage), [dosage, modality, name]);
  const initial = useMemo<Draft>(() => Array.from({ length: spec.rows }, () => Object.fromEntries(spec.fields.map((f) => [f.key, f.prefill == null ? "" : String(f.prefill)]))), [spec]);
  const [rounds, setRounds] = useState<Draft>(initial);
  const [skipped, setSkipped] = useState(false);
  const [hard, setHard] = useState("");
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerStart = useRef<number | null>(null);
  const stopwatch = (modality === "speed" || modality === "conditioning" || modality === "baserunning") && spec.fields.some(f => f.key === "distance");
  const onSynced = useCallback(() => { qc?.invalidateQueries({ queryKey: ["hammer-daily-tasks"] }); }, [qc]);
  const autosave = useAutosave(`task:${storageKey}`, onSynced);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((Date.now() - (timerStart.current ?? Date.now())) / 1000), 100);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey) ?? "null");
      if (saved && Array.isArray(saved.rounds) && saved.rounds.length >= initial.length) {
        setRounds(saved.rounds); setSkipped(!!saved.skipped); setHard(saved.hard ?? ""); setNotes(saved.notes ?? "");
        return;
      }
    } catch { /* fall back to the prescription */ }
    setRounds(initial);
  }, [initial, storageKey]);

  const entered = (rs: Draft) => rs.filter(r => r[TOUCHED] === "1").map((r) => ({ set: rs.indexOf(r) + 1, ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== TOUCHED).map(([k, v]) => [k, v === "" ? null : Number(v)])) }) as Record<string, number | null>)
    .filter(r => stopwatch ? typeof r.time === "number" && r.time > 0 : Object.entries(r).some(([k, v]) => k !== "set" && typeof v === "number" && v > 0));
  const statusOf = (rs: Draft, skip: boolean) => autoStatus({
    prescribedRows: spec.rows,
    targets: Object.fromEntries(spec.fields.map(f => [f.key, f.prefill])),
    rows: entered(rs), lowerIsBetter: stopwatch ? ["time"] : [], skipped: skip,
  });
  const status = statusOf(rounds, skipped) ?? (completed ? "done" : null);

  const persist = (next: Draft, opts: { skip?: boolean; hard?: string; notes?: string; delay?: number } = {}) => {
    const skip = opts.skip ?? skipped, h = opts.hard ?? hard, n = opts.notes ?? notes;
    setRounds(next);
    try { localStorage.setItem(storageKey, JSON.stringify({ rounds: next, skipped: skip, hard: h, notes: n })); } catch { /* memory only */ }
    const logged = entered(next);
    const st = statusOf(next, skip);
    const effort = Number(h);
    const how_hard = effort >= 1 && effort <= 10 ? effort : null;
    const outcome = st === "skipped" ? "skipped" : st === "cut_short" ? "cut_short" : st ? "completed" : null;
    const log = {
      dosage, notes: n.trim() || null, rounds: logged, did_more: st === "did_more",
      fields: spec.fields.map(({ key, label, unit }) => ({ key, label, unit: unit ?? null })),
    };
    if (taskSync && user?.id) {
      autosave.queue({
        kind: "task", id: `task:${storageKey}`, userId: user.id, planDate: taskSync.planDate, at: Date.now(),
        seed: { ...taskSync.seed, payload: { ...(taskSync.seed.payload ?? {}), log, outcome, how_hard } },
        completed: outcome === "completed" || outcome === "cut_short",
      }, opts.delay);
    } else {
      onSave?.(log);
      if (outcome) onOutcome?.(outcome, how_hard);
    }
  };
  const edit = (row: number, key: string, value: string, delay?: number) =>
    persist(rounds.map((r, i) => i === row ? { ...r, [key]: value.replace(/[^\d.]/g, ""), [TOUCHED]: "1" } : r), { delay });
  const touch = (row: number) => {
    if (rounds[row]?.[TOUCHED] === "1") { void autosave.flush(); return; }
    persist(rounds.map((r, i) => i === row ? { ...r, [TOUCHED]: "1" } : r), { delay: 0 });
  };
  const addSet = () => persist([...rounds, Object.fromEntries(spec.fields.map(f => [f.key, ""]))]);
  const stopwatchTap = () => {
    if (!running) { timerStart.current = Date.now(); setElapsed(0); setRunning(true); return; }
    setRunning(false);
    const next = rounds.findIndex(row => !row.time || row[TOUCHED] !== "1");
    if (next >= 0) edit(next, "time", String(Math.round((Date.now() - (timerStart.current ?? Date.now())) / 10) / 100), 0);
  };

  const cols = `28px repeat(${spec.fields.length}, minmax(0, 1fr))`;
  const logged = entered(rounds);
  const primary = spec.fields[0];
  const kindFor = (target: number | null) => timeKindFor({ stopwatch, targetSeconds: target });
  const entries = <section data-exercise-entry-grid className="space-y-2">
    {logHost && <h4 className="text-sm font-semibold">{name}</h4>}
    {stopwatch && <div data-rep-timer className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={stopwatchTap}>{running ? "Stop stopwatch" : "Start stopwatch"}</Button><span className="font-mono text-xs">{elapsed.toFixed(2)} s</span><span className="text-[11px] text-muted-foreground">Stop fills the next time.</span></div>}
    {(modality === "speed" || modality === "conditioning") && <RestTimer label="Rest between repeats" seconds={modality === "speed" ? sprintRestSeconds(spec.fields.find(f => f.key === "distance")?.prefill) : null} />}
    <div className="grid gap-1.5 px-1 text-[10px] uppercase text-muted-foreground" style={{ gridTemplateColumns: cols }}>
      <span>Set</span>
      {spec.fields.map((f) => <span key={f.key}>{f.label}{f.unit && f.key !== "time" ? ` (${f.unit})` : ""}{f.key === "time" && f.prefill ? ` · target ${formatTime(kindFor(f.prefill), f.prefill)}` : ""}</span>)}
    </div>
    {rounds.map((round, index) => (
      <div key={index} data-entry-row={index < spec.rows ? "prescribed" : "added"} className="grid items-center gap-1.5" style={{ gridTemplateColumns: cols }}>
        <span className="text-center text-[11px] text-muted-foreground">{index + 1}{index >= spec.rows ? "+" : ""}</span>
        {spec.fields.map((f) => f.key === "time"
          ? <TimeField key={f.key} kind={kindFor(f.prefill)} label={`${f.label} ${index + 1}`} value={round[f.key] ?? ""} target={f.prefill} onChange={(v) => edit(index, f.key, v)} onBlur={() => touch(index)} />
          : <Input key={f.key} aria-label={`${f.label} ${index + 1}`} inputMode={f.key === "distance" ? "decimal" : "numeric"} value={round[f.key] ?? ""} placeholder={f.prefill != null ? String(f.prefill) : undefined} onFocus={() => touch(index)} onChange={(e) => edit(index, f.key, e.target.value)} onBlur={() => touch(index)} className="h-9 px-2 text-sm" />)}
      </div>
    ))}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" size="sm" variant="outline" className="h-9" onClick={addSet}><Plus className="mr-1 h-3.5 w-3.5" />Add set</Button>
      {status && <span data-auto-status={status} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === "cut_short" ? "bg-muted text-foreground" : "bg-primary/15 text-primary"}`}>{AUTO_STATUS_LABEL[status]}</span>}
    </div>
    {logged.length > 0 && primary && <p data-prescribed-vs-done className="text-[11px] text-muted-foreground">Prescribed: {spec.rows} {spec.rows === 1 ? "set" : "sets"}{primary.prefill ? ` × ${primary.key === "time" ? formatTime(kindFor(primary.prefill), primary.prefill) : `${primary.prefill} ${primary.label.toLowerCase()}`}` : ""} · Done: {logged.length} {logged.length === 1 ? "set" : "sets"}</p>}
    <SavedIndicator state={autosave.state} />
  </section>;
  return (
    <div className="mt-2 space-y-2 rounded border border-border bg-muted/20 p-2" data-legacy-drill-log>
      {logHost ? createPortal(entries, logHost) : <><div className="text-[11px] font-medium">Log this work</div>{entries}</>}
      <div className="space-y-2" data-card-outcome-log>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium">Status:</span>
          <span data-auto-status={status ?? "none"} className="text-[11px] font-semibold">{status ? AUTO_STATUS_LABEL[status] : "Not logged yet — enter your work above"}</span>
          <Button type="button" size="sm" variant={skipped ? "default" : "outline"} className="ml-auto h-9 text-xs" onClick={() => { const s = !skipped; setSkipped(s); persist(rounds, { skip: s, delay: 0 }); }}>{skipped ? "Undo skip" : "Skip"}</Button>
        </div>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="shrink-0 font-medium">How hard 1–10</span>
          <Input aria-label="How hard 1–10" inputMode="numeric" value={hard} onChange={(e) => { const h = e.target.value.replace(/[^\d]/g, "").slice(0, 2); setHard(h); persist(rounds, { hard: h }); }} className="h-9 w-20 px-2 text-sm" />
        </label>
        <div data-exercise-survey><label className="block text-xs">Notes (optional)<Textarea value={notes} onChange={(e) => { setNotes(e.target.value); persist(rounds, { notes: e.target.value, delay: 1200 }); }} /></label></div>
      </div>
    </div>
  );
}
