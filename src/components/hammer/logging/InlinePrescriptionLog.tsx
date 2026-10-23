import { jumpMeasure, timedMobilityMeasure } from "@/lib/logging/measureType";
import { useFocusExercise, FocusDurationTimer } from "../cards/FocusSession";
import { ActivityBasics } from "../cards/ActivityBasics";
import { ExerciseTools } from "../cards/ExerciseTools";
import { DistanceField } from "./DistanceField";
import { ToolSessionWindow } from "../cards/ToolSessionWindow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RestTimer, sprintRestSeconds, liftRestBand } from "../cards/RestTimer";
import { ConditioningBaseRest } from "../cards/ConditioningBaseRest";
import { prescribedBases, sprintRestWhy } from "../../../../supabase/functions/_shared/wic/runRest";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { missedStillEditable } from "@/lib/wic/execution/liftCompletion";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { pendingFor } from "@/lib/logging/logOutbox";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useLatestExerciseLog } from "@/hooks/useExerciseLog";
import { TimeField } from "./TimeField";
import { THROW_TYPES, type ThrowType } from "@/lib/throwing/armLedgerEntry";

/** Throw rows whose exercise IS an arm-ledger throw type feed that ledger row (one row per type per day). */
export function ledgerThrowType(rx: WkRx): ThrowType | null {
  const slug = (rx.movement_slug ?? "").toLowerCase();
  return slug in THROW_TYPES && !slug.startsWith("pap_") ? (slug as ThrowType) : null;
}
import { SavedIndicator, useAutosave } from "./useAutosave";
import { timeKindFor, formatTime } from "@/lib/logging/timeEntry";
import { AUTO_STATUS_LABEL, autoStatus, type AutoStatus } from "@/lib/logging/autoCompletion";

type Field = { key: string; label: string; unit?: string; prefill?: number | null };
type Draft = Record<string, string>[];

export function inlineLogSpec(rx: WkRx): { fields: Field[]; rows: number } {
  const slug = `${rx.movement_slug} ${rx.movement_name}`.toLowerCase();
  const rows = Math.max(1, rx.sets ?? rx.total_reps ?? 1);
  if ((rx.dosage_unit ?? "").toLowerCase() === "throws" || /throw|pitch|bullpen|catch play/.test(slug)) {
    const split = rx.sets && rx.reps && (!rx.total_reps || rx.sets * rx.reps === rx.total_reps);
    return { rows: split ? rx.sets ?? 1 : 1, fields: [{ key: "throws", label: "Throws", prefill: split ? rx.reps : rx.total_reps ?? rx.reps }] };
  }
  // Skill logging (Round 3 item F): these mirror the logTemplates skill forms so
  // the pop-up entry grid matches the drill, not a generic reps box.
  if (/pop[_ ]time|catcher[_ ]pop|pop[_ ]to[_ ]second|catcher[_ ]throw/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "time", label: "Pop time", unit: "ss.hh" },
      { key: "throws", label: "Throws" },
    ] };
  }
  if ((rx.slot as string) === "baserunning" || /home[_ ]to[_ ]first|steal|baserun|lead[_ ]off|first[_ ]to[_ ]third/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "distance", label: "Distance", unit: "ft", prefill: rx.distance_feet },
      { key: "time", label: "Time", unit: "ss.hh" },
      { key: "jump", label: "Reaction / jump (1–5)" },
    ] };
  }
  if ((rx.slot as string) === "defense" || (rx.slot as string) === "fielding" || /fielding|ground[_ ]ball|glove[_ ]work|infield|outfield|short[_ ]hop/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "reps", label: "Reps", prefill: rx.reps },
      { key: "clean", label: "Clean plays" },
      { key: "throws", label: "Throws (count toward your arm total)" },
    ] };
  }
  if (rx.slot !== "lift" && rx.slot !== "supplemental" && ((rx.slot as string) === "hitting" || /tee[_ ]work|front[_ ]toss|soft[_ ]toss|batting[_ ]practice|dry[_ ]hack|swing/.test(slug))) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "swings", label: "Swings", prefill: rx.reps },
      { key: "quality", label: "Quality contact" },
      { key: "bat_speed", label: "Bat speed", unit: "mph" },
      { key: "exit_velo", label: "Exit velo", unit: "mph" },
    ] };
  }
  const jump = jumpMeasure(`${rx.movement_slug ?? ""} ${rx.movement_name ?? ""}`);
  if (jump === "jump_distance") {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "distance", label: "Jump distance", unit: "ft + in" }] };
  }
  if (jump === "jump_height") {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "height", label: "Jump height", unit: "in" }] };
  }
  if (timedMobilityMeasure(slug) && !/throw|pitch|sprint|sled/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "time", label: "Seconds", unit: "s", prefill: rx.duration_seconds ?? ((rx.dosage_unit ?? "").toLowerCase() === "seconds" ? rx.reps : null) }] };
  }
  if (rx.total_reps && !rx.distance_feet && !rx.duration_seconds && rx.slot !== "lift" && rx.slot !== "supplemental" && !/hold|iso|plank/.test(slug)) {
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
  if (rx.slot === "speed" && /broad[_ ]jump|standing[_ ](long|broad)[_ ]jump/.test(slug)) {
    // Broad jump is measured by distance, never seconds or plain reps.
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "distance", label: "Jump distance", unit: "ft + in" }] };
  }
  if (rx.slot === "speed" && /vertical[_ ]jump|countermovement/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "height", label: "Jump height", unit: "in" }] };
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

const TOUCHED = "_t";

/** Rows the player actually entered. A prefilled value counts once the player taps into its row; a prefilled distance alone is not a timed repeat. */
export function enteredPrescriptionRounds(rounds: Draft, spec: ReturnType<typeof inlineLogSpec>, opts: { requireTouch?: boolean } = {}) {
  const timedRepeat = spec.fields.some(f => f.key === "distance") && spec.fields.some(f => f.key === "time");
  return rounds.map((r, i) => ({ r, i }))
    .filter(({ r }) => !opts.requireTouch || r[TOUCHED] === "1")
    .map(({ r, i }) => ({ set: i + 1, ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== TOUCHED).map(([k, v]) => [k, v === "" ? null : Number(v)])) }) as Record<string, number | null>)
    .filter(r => timedRepeat ? typeof r.time === "number" && r.time > 0 : Object.entries(r).some(([k, v]) => k !== "set" && typeof v === "number" && Number.isFinite(v) && v > 0));
}

/** True when the time field is a stopwatch time (faster = better), not a hold duration. */
export function isStopwatchTime(rx: WkRx, spec: ReturnType<typeof inlineLogSpec>) {
  return spec.fields.some(f => f.key === "time") && spec.fields.some(f => f.key === "distance") && (rx.slot === "speed" || rx.slot === "conditioning");
}

export function inlineStatus(rx: WkRx, spec: ReturnType<typeof inlineLogSpec>, rows: Record<string, number | null>[], today: string = new Date().toISOString().slice(0, 10)): AutoStatus {
  const stopwatch = isStopwatchTime(rx, spec);
  return autoStatus({
    prescribedRows: spec.rows,
    targets: Object.fromEntries(spec.fields.filter(f => f.key !== "weight").map(f => [f.key, f.prefill ?? null])),
    rows, lowerIsBetter: stopwatch ? ["time"] : [],
    skipped: rx.status === "skipped",
    dayOver: rx.status === "missed" || rx.plan_date < today,
  });
}

export function InlinePrescriptionLog({ rx }: { rx: WkRx }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const spec = useMemo(() => inlineLogSpec(rx), [rx]);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  // Key the draft on the movement too: an "Alternative" swap rewrites this
  // row's slug/dose, and the log rows must match the NEW exercise at once —
  // never hydrate stale fields from the pre-swap draft.
  const key = `hammer-log-draft:${rx.id}:${rx.movement_slug}`;
  const [rounds, setRounds] = useState<Draft>(() => seed(spec));
  const onSynced = useCallback(() => {
    if (!user?.id) return;
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
    qc.invalidateQueries({ queryKey: ["exercise-log", user.id, rx.id] });
  }, [qc, rx.id, rx.plan_date, user?.id]);
  const autosave = useAutosave(`exercise_log:${rx.id}`, onSynced);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
  }, [key]);

  useEffect(() => {
    if (hydrated.current && !latest) return;
    let stored: unknown = null;
    try { stored = JSON.parse(localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? "null"); } catch { stored = null; }
    const prior = (latest as any)?.metrics?.rounds;
    const base = seed(spec);
    if (Array.isArray(stored) && stored.length >= spec.rows) { setRounds(stored as Draft); hydrated.current = true; return; }
    if (Array.isArray(prior) && prior.length) {
      const next = [...base];
      prior.forEach((r: Record<string, unknown>, n: number) => {
        const i = typeof r?.set === "number" && r.set >= 1 ? (r.set as number) - 1 : n;
        while (next.length <= i) next.push(Object.fromEntries(spec.fields.map(f => [f.key, ""])));
        next[i] = { ...next[i], ...Object.fromEntries(Object.entries(r ?? {}).filter(([k]) => spec.fields.some(f => f.key === k)).map(([k, v]) => [k, v == null ? "" : String(v)])), [TOUCHED]: "1" };
      });
      setRounds(next);
    } else setRounds(base);
    hydrated.current = true;
  }, [key, latest, spec]);

  const entered = enteredPrescriptionRounds(rounds, spec, { requireTouch: true });
  const status = inlineStatus(rx, spec, entered);

  const persist = (next: Draft, delay?: number) => {
    setRounds(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { sessionStorage.setItem(key, JSON.stringify(next)); }
    if (!user?.id) return;
    const payload = enteredPrescriptionRounds(next, spec, { requireTouch: true });
    const st = inlineStatus(rx, spec, payload);
    const credited = payload.length > 0 && (rx.status !== "missed" || missedStillEditable(rx.plan_date));
    autosave.queue({
      kind: "exercise_log", id: `exercise_log:${rx.id}`, userId: user.id, at: Date.now(),
      payload: {
        prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug,
        rounds: payload,
        rpe: latest?.rpe ?? null, bar_feel: latest?.bar_feel ?? null, notes: latest?.notes ?? null, ai_readback: latest?.ai_readback ?? null,
        extra_metrics: (latest as any)?.metrics ?? null,
        outcome: payload.length ? (st === "cut_short" ? "cut_short" : "completed") : undefined,
        did_more: st === "did_more",
        template_id: `inline_${rx.slot}`,
        field_schema: spec.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: f.key === "time" ? "seconds" : "number" })),
      },
      credit: credited ? { id: rx.id, plan_date: rx.plan_date, slot: rx.slot, movement_name: rx.movement_name, movement_slug: rx.movement_slug } : null,
    }, delay);
    const tt = ledgerThrowType(rx);
    if (tt && spec.fields.some(f => f.key === "throws")) {
      const total = payload.reduce((a, r) => a + (typeof r.throws === "number" ? r.throws : 0), 0);
      const planned = spec.rows * (spec.fields[0].prefill ?? 0);
      // Blank = done at the planned number (ledger rule); entered throws, including added sets, replace it.
      autosave.queue({ kind: "arm", id: `arm:${rx.plan_date}:${tt}`, userId: user.id, at: Date.now(),
        row: { entry_date: rx.plan_date, source: THROW_TYPES[tt].source, throw_type: tt, count: payload.length ? total : planned, prescribed: planned || null, status: rx.status === "skipped" ? "skipped" : "done" } }, delay);
    }
  };
  const edit = (i: number, field: string, value: string, delay?: number) => {
    persist(rounds.map((r, n) => n === i ? { ...r, [field]: value.replace(/[^\d.]/g, ""), [TOUCHED]: "1" } : r), delay);
  };
  const touch = (i: number) => {
    if (rounds[i]?.[TOUCHED] === "1") { void autosave.flush(); return; }
    persist(rounds.map((r, n) => n === i ? { ...r, [TOUCHED]: "1" } : r), 0);
  };
  const addSet = () => persist([...rounds, Object.fromEntries(spec.fields.map(f => [f.key, ""]))]);

  const stopwatch = isStopwatchTime(rx, spec);
  const hasTime = stopwatch;
  const restBand = liftRestBand(rx);
  const isSprint = (rx.slot === "speed" && hasTime) || ((rx.slot === "lift" || rx.slot === "supplemental") && /sprint/.test(rx.movement_slug.toLowerCase()));
  const sprintSeconds = isSprint ? sprintRestSeconds(rx.distance_feet) : null;
  const basesPerRep = rx.slot === "conditioning" ? prescribedBases(rx.movement_slug, rx.distance_feet) : null;
  const focus = useFocusExercise({ id: `rx:${rx.id}`, name: rx.movement_name, rows: spec.rows,
    ready: rounds.map((round, i) => enteredPrescriptionRounds([round], spec, { requireTouch: true }).length > 0 && i < spec.rows),
    restSeconds: isSprint ? sprintSeconds : (rx.slot === "lift" || rx.slot === "supplemental" || /hold|iso|plank|throw|pitch/.test(rx.movement_slug)) ? restBand.min : null,
    bases: basesPerRep,
    save: async () => { if (!(await autosave.flush())) throw new Error("Save pending"); },
  });
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
    const secs = String(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 10) / 100);
    const i = rounds.findIndex((r) => !r.time);
    if (i >= 0) edit(i, "time", secs, 0);
  };
  const primary = spec.fields.find(f => f.key !== "weight" && f.key !== "time" && f.key !== "distance") ?? spec.fields.find(f => f.key === "time") ?? spec.fields[0];
  const doneTotal = entered.reduce((s, r) => s + (typeof r[primary.key] === "number" ? (r[primary.key] as number) : 0), 0);
  const unitWord = primary.key === "time" ? "" : ` ${primary.label.toLowerCase()}`;
  const fmt = (v: number) => primary.key === "time" ? formatTime(timeKindFor({ stopwatch, targetSeconds: primary.prefill }), v) : String(v);
  const showDone = !(primary.key === "time" && stopwatch);
  return <div className="space-y-2" data-inline-prescription-log hidden={!focus.visible || (focus.active && focus.resting)}>
    <h4 className="text-sm font-semibold break-words">{rx.movement_name} <span className="text-xs font-normal text-muted-foreground">(instructions below)</span></h4>
    {focus.active && !stopwatch && spec.fields.some(f => f.key === "time" && (f.prefill ?? 0) > 0) && <FocusDurationTimer key={focus.row} target={spec.fields.find(f => f.key === "time")?.prefill ?? 0} onDone={value => edit(focus.row, "time", String(value), 0)} />}
    {hasTime && <div className="flex items-center gap-2" data-rep-timer>
      <Button type="button" size="sm" variant={running ? "default" : "outline"} className="h-9 min-w-[96px]" onClick={toggleTimer}>{running ? "Stop timer" : "Start timer"}</Button>
      <span className="font-mono text-sm tabular-nums text-foreground" aria-live="polite">{elapsed.toFixed(2)} s</span>
      <span className="text-[11px] text-muted-foreground">Stop fills the next rep's time.</span>
    </div>}
    {!focus.active && !isSprint && (rx.slot === "lift" || rx.slot === "supplemental" || /hold|iso|plank/.test(rx.movement_slug)) && <RestTimer label="Rest between sets" seconds={restBand.min} maxSeconds={restBand.max} />}
    {isSprint && <>{!focus.active && <RestTimer label="Rest after each run set" seconds={sprintSeconds} />}<p className="text-xs text-muted-foreground">{sprintRestWhy(rx.distance_feet) ?? "Run distance not entered — rest time is not yet set."}</p></>}
    {!focus.active && basesPerRep && <ConditioningBaseRest basesPerRep={basesPerRep} />}
    <div className="grid gap-1.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: `28px repeat(${spec.fields.length}, minmax(0, 1fr))` }}>
      <span>Set</span>{spec.fields.map((f) => <span key={f.key}>{f.label}{f.unit && f.key !== "time" ? ` (${f.unit})` : ""}{f.key === "time" && f.prefill ? ` · target ${formatTime(timeKindFor({ stopwatch, targetSeconds: f.prefill }), f.prefill)}` : ""}</span>)}
    </div>
    {rounds.map((round, i) => <div key={i} hidden={focus.active && i !== focus.row} data-entry-row={i < spec.rows ? "prescribed" : "added"} className={`${focus.active && i !== focus.row ? "hidden" : "grid"} items-center gap-1.5`} style={{ gridTemplateColumns: `28px repeat(${spec.fields.length}, minmax(0, 1fr))` }}>
      <span className="text-center text-[11px] text-muted-foreground">{i + 1}{i >= spec.rows ? "+" : ""}</span>
      {spec.fields.map((f) => f.key === "time"
        ? <TimeField key={f.key} kind={timeKindFor({ stopwatch, targetSeconds: f.prefill })} label={`${f.label} ${i + 1}`} value={round[f.key] ?? ""} target={f.prefill} onChange={(v) => edit(i, f.key, v)} onBlur={() => touch(i)} />
        : f.unit === "ft + in" ? <DistanceField key={f.key} label={`${f.label} ${i + 1}`} value={round[f.key] ?? ""} onChange={v => edit(i, f.key, v)} onBlur={() => touch(i)} />
        : <Input key={f.key} aria-label={`${f.label} ${i + 1}`} inputMode={f.key === "weight" || f.key === "distance" ? "decimal" : "numeric"} value={round[f.key] ?? ""} placeholder={f.prefill != null ? String(f.prefill) : undefined} onFocus={() => touch(i)} onChange={(e) => edit(i, f.key, e.target.value)} onBlur={() => touch(i)} className="h-9 px-2 text-sm" />)}
    </div>)}
    <ExerciseTools module={rx.slot} exerciseId={rx.id} planDate={rx.plan_date} />
    {focus.active && ["throwing", "pitching", "hitting", "baserunning"].includes(rx.slot) && user && <ToolSessionWindow label="Practice session log" route={`/practice?module=${rx.slot}&drill_type=${encodeURIComponent(rx.movement_slug)}`} kind="practice" />}
    {focus.active && <ActivityBasics name={rx.movement_name} slug={rx.movement_slug} cue={rx.why_payload?.cue} />}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" size="sm" variant="outline" className="h-9" onClick={addSet}><Plus className="mr-1 h-3.5 w-3.5" />Add set</Button>
      {status && <span data-auto-status={status} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === "cut_short" || status === "missed" ? "bg-muted text-foreground" : "bg-primary/15 text-primary"}`}>{AUTO_STATUS_LABEL[status]}</span>}
    </div>
    {entered.length > 0 && <p data-prescribed-vs-done className="text-[11px] text-muted-foreground">Prescribed: {spec.rows} {spec.rows === 1 ? "set" : "sets"}{primary.prefill ? ` × ${fmt(primary.prefill)}${unitWord}` : ""} · Done: {entered.length} {entered.length === 1 ? "set" : "sets"}{showDone && doneTotal ? `, ${fmt(doneTotal)}${unitWord} total` : ""}</p>}
    <SavedIndicator state={autosave.state} />
  </div>;
}
