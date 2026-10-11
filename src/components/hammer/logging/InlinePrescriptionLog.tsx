import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RestTimer, sprintRestSeconds } from "../cards/RestTimer";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { markPrescriptionDone, missedStillEditable } from "@/lib/wic/execution/liftCompletion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useLatestExerciseLog, useSaveExerciseLog } from "@/hooks/useExerciseLog";

type Field = { key: string; label: string; unit?: string; prefill?: number | null };
type Draft = Record<string, string>[];

export function inlineLogSpec(rx: WkRx): { fields: Field[]; rows: number } {
  const slug = `${rx.movement_slug} ${rx.movement_name}`.toLowerCase();
  const rows = Math.max(1, rx.sets ?? rx.total_reps ?? 1);
  if ((rx.dosage_unit ?? "").toLowerCase() === "throws" || /throw|pitch|bullpen|catch play/.test(slug)) {
    const split = rx.sets && rx.reps && (!rx.total_reps || rx.sets * rx.reps === rx.total_reps);
    return { rows: split ? rx.sets ?? 1 : 1, fields: [{ key: "throws", label: "Throws", prefill: split ? rx.reps : rx.total_reps ?? rx.reps }] };
  }
  if (rx.total_reps && !/hold|iso|plank/.test(slug)) {
    // Rows must add up to the total shown on the card: sets × reps only when that equals the total.
    const split = rx.sets && rx.reps && rx.sets * rx.reps === rx.total_reps;
    return { rows: split ? rx.sets ?? 1 : 1, fields: [{ key: "reps", label: "Reps", prefill: split ? rx.reps : rx.total_reps }] };
  }
  if ((rx.dosage_unit ?? "").toLowerCase() === "seconds" || /hold|iso|plank/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "time", label: "Seconds", unit: "s", prefill: rx.duration_seconds ?? rx.reps }] };
  }
  if (rx.slot === "conditioning") {
    return { rows, fields: [
      ...(rx.distance_feet ? [{ key: "distance", label: "Distance", unit: "ft", prefill: rx.distance_feet }] : []),
      ...(rx.distance_feet || rx.duration_seconds ? [{ key: "time", label: "Time", unit: "s", prefill: rx.duration_seconds }] : []),
      ...(!rx.distance_feet && !rx.duration_seconds ? [{ key: "reps", label: "Reps", prefill: rx.reps }] : []),
    ] };
  }
  if (rx.slot === "speed" && /jump|bound|hop|pogo|plyo/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "reps", label: "Reps", prefill: rx.reps }] };
  }
  if (rx.slot === "speed") {
    return { rows: Math.max(1, rx.sets ?? rx.reps ?? 1), fields: [
      { key: "distance", label: "Distance", unit: "ft", prefill: rx.distance_feet },
      { key: "time", label: "Time", unit: "s" },
    ] };
  }
  if (rx.slot === "lift" || rx.slot === "supplemental") {
    // Owner fix 4: bands and body-weight work carry no weight to log.
    const noWeight = /\bband|banded|bodyweight|body[- ]weight|push[- ]?up|pull[- ]?up|chin[- ]?up|bird[- ]?dog|dead[- ]?bug|arm[- ]care/.test(slug);
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "reps", label: "Reps", prefill: rx.reps },
      ...(noWeight ? [] : [{ key: "weight", label: "Weight", unit: "lb" }]),
    ] };
  }
  return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "reps", label: "Reps", prefill: rx.reps ?? rx.total_reps }] };
}

function seed(spec: ReturnType<typeof inlineLogSpec>): Draft {
  return Array.from({ length: spec.rows }, () => Object.fromEntries(spec.fields.map((f) => [f.key, f.prefill == null ? "" : String(f.prefill)])));
}

export function InlinePrescriptionLog({ rx }: { rx: WkRx }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const spec = useMemo(() => inlineLogSpec(rx), [rx]);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const save = useSaveExerciseLog();
  const key = `hammer-log-draft:${rx.id}`;
  const [rounds, setRounds] = useState<Draft>(() => seed(spec));

  useEffect(() => {
    const stored = sessionStorage.getItem(key);
    const prior = (latest as any)?.metrics?.rounds;
    try {
      const source = stored ? JSON.parse(stored) : prior;
      setRounds(seed(spec).map((row, i) => Array.isArray(source) && source.length === spec.rows ? { ...row, ...Object.fromEntries(Object.entries(source[i] ?? {}).filter(([k]) => spec.fields.some(f => f.key === k)).map(([k, v]) => [k, v == null ? "" : String(v)])) } : row));
    } catch { setRounds(seed(spec)); }
  }, [key, latest, spec]);

  const edit = (i: number, field: string, value: string) => {
    const next = rounds.map((r, n) => n === i ? { ...r, [field]: value.replace(/[^\d.]/g, "") } : r);
    setRounds(next);
    sessionStorage.setItem(key, JSON.stringify(next));
  };
  const handleSave = async () => {
    const payload = rounds.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === "" ? null : Number(v)]))).filter(r => Object.values(r).some(v => typeof v === "number" && v > 0));
    if (!payload.length) { toast.error("Enter the work you completed first."); return; }
    await save.mutateAsync({
      prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug,
      rounds: payload,
      rpe: latest?.rpe ?? null, bar_feel: latest?.bar_feel ?? null, notes: latest?.notes ?? null, ai_readback: latest?.ai_readback ?? null,
      outcome: payload.length >= spec.rows ? "completed" : "cut_short",
      template_id: `inline_${rx.slot}`,
      field_schema: spec.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: "number" })),
    });
    if (user?.id && (rx.status !== "missed" || missedStillEditable(rx.plan_date))) {
      const error = await markPrescriptionDone(rx, user.id);
      if (error) { toast.error("Log saved, but credit couldn't be updated. Try again."); return; }
      qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
    }
    sessionStorage.removeItem(key);
    toast.success(payload.length >= spec.rows ? "Log saved — Done." : "Log saved — Cut short.");
  };
  const hasTime = spec.fields.some((f) => f.key === "time") && (rx.slot === "speed" || rx.slot === "conditioning");
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((Date.now() - (startedAt.current ?? Date.now())) / 1000), 100);
    return () => window.clearInterval(id);
  }, [running]);
  const toggleTimer = () => {
    if (!running) { startedAt.current = Date.now(); setElapsed(0); setRunning(true); return; }
    setRunning(false);
    const secs = ((Date.now() - (startedAt.current ?? Date.now())) / 1000).toFixed(2);
    const i = rounds.findIndex((r) => !r.time);
    if (i >= 0) edit(i, "time", secs);
  };
  return <div className="space-y-2" data-inline-prescription-log>
    {hasTime && <div className="flex items-center gap-2" data-rep-timer>
      <Button type="button" size="sm" variant={running ? "default" : "outline"} className="h-9 min-w-[96px]" onClick={toggleTimer}>{running ? "Stop timer" : "Start timer"}</Button>
      <span className="font-mono text-sm tabular-nums text-foreground" aria-live="polite">{elapsed.toFixed(2)} s</span>
      <span className="text-[11px] text-muted-foreground">Stop fills the next rep's time.</span>
    </div>}
    {(rx.slot === "lift" || rx.slot === "supplemental" || /hold|iso|plank/.test(rx.movement_slug)) && <RestTimer label="Rest between sets" seconds={(rx as WkRx & { rest_seconds?: number | null }).rest_seconds} />}
    {rx.slot === "speed" && hasTime && <RestTimer label="Rest between sprints" seconds={sprintRestSeconds(rx.distance_feet)} />}
    <div className="grid gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: `28px repeat(${spec.fields.length}, minmax(0, 1fr))` }}>
      <span />{spec.fields.map((f) => <span key={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ""}</span>)}
    </div>
    {rounds.map((round, i) => <div key={i} className="grid items-center gap-1.5" style={{ gridTemplateColumns: `28px repeat(${spec.fields.length}, minmax(0, 1fr))` }}>
      <span className="text-center text-[11px] text-muted-foreground">{i + 1}</span>
      {spec.fields.map((f) => <Input key={f.key} aria-label={`${f.label} ${i + 1}`} inputMode="decimal" value={round[f.key] ?? ""} onChange={(e) => edit(i, f.key, e.target.value)} className="h-9 px-2 text-sm" />)}
    </div>)}
    <Button type="button" size="sm" onClick={handleSave} disabled={save.isPending} className="w-full">{save.isPending ? "Saving…" : "Save log"}</Button>
  </div>;
}