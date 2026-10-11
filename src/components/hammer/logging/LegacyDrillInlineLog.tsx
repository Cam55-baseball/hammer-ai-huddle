import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { usePocketLogHost } from "../cards/PocketCard";
import { RestTimer, sprintRestSeconds } from "../cards/RestTimer";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { legacyDrillLogSpec } from "@/lib/hammer/prescription/legacyDrillLog";

type Draft = Record<string, string>[];

export function LegacyDrillInlineLog({
  modality,
  name,
  dosage,
  storageKey,
  completed,
  onSave,
  onOutcome,
}: {
  modality: string;
  name: string;
  dosage: string;
  storageKey: string;
  completed: boolean;
  onSave: (log: Record<string, unknown>) => void;
  onOutcome?: (outcome: "completed" | "skipped" | "cut_short", how_hard: number | null) => void;
}) {
  const logHost = usePocketLogHost();
  const [outcome, setOutcome] = useState<"completed" | "skipped" | "cut_short" | null>(completed ? "completed" : null);
  const [hard, setHard] = useState("");
  const [notes, setNotes] = useState("");
  const spec = useMemo(() => legacyDrillLogSpec(modality, name, dosage), [dosage, modality, name]);
  const initial = useMemo<Draft>(() => Array.from({ length: spec.rows }, () => Object.fromEntries(spec.fields.map((field) => [field.key, field.prefill == null ? "" : String(field.prefill)]))), [spec]);
  const [rounds, setRounds] = useState<Draft>(initial);
  const [done, setDone] = useState(completed);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      setRounds(saved ? JSON.parse(saved) : initial);
    } catch {
      setRounds(initial);
    }
  }, [initial, storageKey]);

  const edit = (row: number, key: string, value: string) => {
    const next = rounds.map((round, index) => index === row ? { ...round, [key]: value.replace(/[^\d.]/g, "") } : round);
    setRounds(next);
    sessionStorage.setItem(storageKey, JSON.stringify(next));
  };

  const save = () => {
    onSave({
      dosage,
      notes: notes.trim() || null,
      completed: spec.completion ? done : true,
      rounds: rounds.map((round) => Object.fromEntries(Object.entries(round).map(([key, value]) => [key, value === "" ? null : Number(value)]))),
      fields: spec.fields.map(({ key, label, unit }) => ({ key, label, unit: unit ?? null })),
    });
    sessionStorage.removeItem(storageKey);
  };

  const gridClass = spec.fields.length === 2
    ? "grid grid-cols-[28px_repeat(2,minmax(0,1fr))] gap-1.5"
    : "grid grid-cols-[28px_minmax(0,1fr)] gap-1.5";

  const entries = <section data-exercise-entry-grid className="space-y-2">
    {logHost && <h4 className="text-sm font-semibold">{name}</h4>}
    {(modality === "speed" || modality === "conditioning") && <RestTimer label="Rest between repeats" seconds={modality === "speed" ? sprintRestSeconds(spec.fields.find(f => f.key === "distance")?.prefill) : null} />}
      {spec.completion && (
        <label className="flex min-h-9 items-center gap-2 text-xs">
          <Checkbox checked={done} onCheckedChange={(value) => setDone(value === true)} />
          Completed
        </label>
      )}
      <div className={`${gridClass} px-1 text-[10px] uppercase text-muted-foreground`}>
        <span />
        {spec.fields.map((field) => <span key={field.key}>{field.label}{field.unit ? ` (${field.unit})` : ""}</span>)}
      </div>
      {rounds.map((round, index) => (
        <div key={index} className={`${gridClass} items-center`}>
          <span className="text-center text-[11px] text-muted-foreground">{index + 1}</span>
          {spec.fields.map((field) => (
            <Input key={field.key} aria-label={`${field.label} ${index + 1}`} inputMode="decimal" value={round[field.key] ?? ""} onChange={(event) => edit(index, field.key, event.target.value)} className="h-9 px-2 text-sm" />
          ))}
        </div>
      ))}
      <Button type="button" size="sm" className="w-full" onClick={save}>Save log</Button>
  </section>;
  return (
    <div className="mt-2 space-y-2 rounded border border-border bg-muted/20 p-2" data-legacy-drill-log>
      {logHost ? createPortal(entries, logHost) : <><div className="text-[11px] font-medium">Log this work</div>{entries}</>}
      {onOutcome && <div className="space-y-2" data-card-outcome-log>
        <div className="grid grid-cols-3 gap-1.5">
          {([["completed", "Done"], ["skipped", "Skipped"], ["cut_short", "Cut short"]] as const).map(([k, label]) => (
            <Button key={k} type="button" size="sm" variant={outcome === k ? "default" : "outline"} className="h-9 text-xs"
              onClick={() => { setOutcome(k); const n = Number(hard); onOutcome(k, n >= 1 && n <= 10 ? n : null); }}>{label}</Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="shrink-0 font-medium">How hard 1–10</span>
          <Input aria-label="How hard 1–10" inputMode="numeric" value={hard} onChange={(e) => setHard(e.target.value.replace(/[^\d]/g, "").slice(0, 2))} className="h-9 w-20 px-2 text-sm" />
        </label>
        <div data-exercise-survey><label className="block text-xs">Notes (optional)<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label></div>
      </div>}
    </div>
  );
}