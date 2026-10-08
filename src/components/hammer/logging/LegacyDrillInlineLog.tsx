import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
}: {
  modality: string;
  name: string;
  dosage: string;
  storageKey: string;
  completed: boolean;
  onSave: (log: Record<string, unknown>) => void;
}) {
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
      completed: spec.completion ? done : true,
      rounds: rounds.map((round) => Object.fromEntries(Object.entries(round).map(([key, value]) => [key, value === "" ? null : Number(value)]))),
      fields: spec.fields.map(({ key, label, unit }) => ({ key, label, unit: unit ?? null })),
    });
    sessionStorage.removeItem(storageKey);
  };

  return (
    <div className="mt-2 space-y-2 rounded border border-border bg-muted/20 p-2" data-legacy-drill-log>
      <div className="text-[11px] font-medium">Log this work</div>
      {spec.completion && (
        <label className="flex min-h-9 items-center gap-2 text-xs">
          <Checkbox checked={done} onCheckedChange={(value) => setDone(value === true)} />
          Completed
        </label>
      )}
      <div className="grid grid-cols-[28px_repeat(2,minmax(0,1fr))] gap-1.5 px-1 text-[10px] uppercase text-muted-foreground">
        <span />
        {spec.fields.map((field) => <span key={field.key}>{field.label}{field.unit ? ` (${field.unit})` : ""}</span>)}
      </div>
      {rounds.map((round, index) => (
        <div key={index} className="grid grid-cols-[28px_repeat(2,minmax(0,1fr))] items-center gap-1.5">
          <span className="text-center text-[11px] text-muted-foreground">{index + 1}</span>
          {spec.fields.map((field) => (
            <Input key={field.key} aria-label={`${field.label} ${index + 1}`} inputMode="decimal" value={round[field.key] ?? ""} onChange={(event) => edit(index, field.key, event.target.value)} className="h-9 px-2 text-sm" />
          ))}
        </div>
      ))}
      <Button type="button" size="sm" className="w-full" onClick={save}>Save log</Button>
    </div>
  );
}