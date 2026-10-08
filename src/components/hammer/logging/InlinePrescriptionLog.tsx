import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "throws", label: "Throws", prefill: rx.reps ?? rx.total_reps }] };
  }
  if (rx.total_reps && !/hold|iso|plank/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "reps", label: "Reps", prefill: rx.reps ?? rx.total_reps }] };
  }
  if ((rx.dosage_unit ?? "").toLowerCase() === "seconds" || /hold|iso|plank/.test(slug)) {
    return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "time", label: "Seconds", unit: "s", prefill: rx.duration_seconds ?? rx.reps }] };
  }
  if (rx.slot === "conditioning") {
    return { rows, fields: [
      ...(rx.distance_feet ? [{ key: "distance", label: "Distance", unit: "ft", prefill: rx.distance_feet }] : []),
      ...(rx.duration_seconds ? [{ key: "time", label: "Time", unit: "s", prefill: rx.duration_seconds }] : []),
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
    return { rows: Math.max(1, rx.sets ?? 1), fields: [
      { key: "reps", label: "Reps", prefill: rx.reps },
      { key: "weight", label: "Weight", unit: "lb" },
    ] };
  }
  return { rows: Math.max(1, rx.sets ?? 1), fields: [{ key: "reps", label: "Reps", prefill: rx.reps ?? rx.total_reps }] };
}

function seed(spec: ReturnType<typeof inlineLogSpec>): Draft {
  return Array.from({ length: spec.rows }, () => Object.fromEntries(spec.fields.map((f) => [f.key, f.prefill == null ? "" : String(f.prefill)])));
}

export function InlinePrescriptionLog({ rx }: { rx: WkRx }) {
  const spec = useMemo(() => inlineLogSpec(rx), [rx]);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const save = useSaveExerciseLog();
  const key = `hammer-log-draft:${rx.id}`;
  const [rounds, setRounds] = useState<Draft>(() => seed(spec));

  useEffect(() => {
    const stored = sessionStorage.getItem(key);
    const prior = (latest as any)?.metrics?.rounds;
    try { setRounds(stored ? JSON.parse(stored) : Array.isArray(prior) && prior.length ? prior.map((r: any) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)]))) : seed(spec)); }
    catch { setRounds(seed(spec)); }
  }, [key, latest, spec]);

  const edit = (i: number, field: string, value: string) => {
    const next = rounds.map((r, n) => n === i ? { ...r, [field]: value.replace(/[^\d.]/g, "") } : r);
    setRounds(next);
    sessionStorage.setItem(key, JSON.stringify(next));
  };
  const handleSave = async () => {
    await save.mutateAsync({
      prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug,
      rounds: rounds.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === "" ? null : Number(v)]))),
      template_id: `inline_${rx.slot}`,
      field_schema: spec.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: "number" })),
    });
    sessionStorage.removeItem(key);
    toast.success("Log saved");
  };
  return <div className="space-y-2" data-inline-prescription-log>
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