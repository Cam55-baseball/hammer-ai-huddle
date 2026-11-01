import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROGRAMS } from "../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";
import { CARE_MEASURES, careMeasureProblems } from "@/lib/prescription/ownerPlanDrills";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";
import { CARE_AREAS, CARE_AREA_LABEL, CARE_TYPES, CARE_TYPE_LABEL, CARE_CONTEXTS, CARE_CONTEXT_LABEL } from "../../../supabase/functions/_shared/tissueCare/matching";

const CARE_ROLES = [["pitcher", "Pitchers"], ["position", "Position players"]] as const;

function Chips({ label, options, value, onChange }: { label: string; options: readonly (readonly [string, string])[]; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="col-span-2"><Label>{label}</Label>
    <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map(([k, l]) => { const on = value.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== k) : [...value, k])}><Badge variant={on ? "default" : "outline"}>{l}</Badge></button>; })}
    </div></div>;
}

type Draft = Partial<OwnerDrillRow> & { conditioning_programs?: string[] };

/** Owner Nov 1: measure + Programs for Tissue care and Focus routine activities. */
export function CareFields({ draft, set }: { draft: Draft; set: (k: string, v: unknown) => void }) {
  const m = draft.care_measure ?? null;
  const programs = draft.conditioning_programs ?? [];
  const problems = careMeasureProblems(draft as any);
  return <div className="grid grid-cols-2 gap-2 sm:col-span-2" aria-label="Tissue care and focus routine fields">
    <div><Label>Measure</Label><Select value={m ?? "none"} onValueChange={v => set("care_measure", v === "none" ? null : v)}>
      <SelectTrigger aria-label="Measure"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">Not set</SelectItem>{CARE_MEASURES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
    </Select></div>
    {m === "time" && <div><Label>Minutes</Label><Input aria-label="Minutes" type="number" inputMode="numeric" value={draft.work_seconds ? Math.round(draft.work_seconds / 60) : ""} onChange={e => set("work_seconds", e.target.value === "" ? null : Math.round(Number(e.target.value)) * 60)} /></div>}
    {m === "rounds" && <div><Label>Rounds</Label><Input aria-label="Rounds" type="number" inputMode="numeric" value={draft.rounds ?? ""} onChange={e => set("rounds", e.target.value === "" ? null : Math.round(Number(e.target.value)))} /></div>}
    <div className="col-span-2"><Label>Programs (none picked = all subscribers)</Label>
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Programs">
        {PROGRAMS.map(([k, l]) => { const on = programs.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => set("conditioning_programs", on ? programs.filter(x => x !== k) : [...programs, k])}><Badge variant={on ? "default" : "outline"}>{l}</Badge></button>; })}
      </div>
    </div>
    {(draft.placements ?? []).includes("hammers_today:tissue_care") && <>
      <Chips label="Body areas (tissue care matching)" options={CARE_AREAS.map(a => [a, CARE_AREA_LABEL[a]] as const)} value={draft.care_areas ?? []} onChange={v => set("care_areas", v)} />
      <Chips label="Movement types" options={CARE_TYPES.map(t => [t, CARE_TYPE_LABEL[t]] as const)} value={draft.care_types ?? []} onChange={v => set("care_types", v)} />
      <Chips label="Where it fits (none picked = anywhere)" options={CARE_CONTEXTS.map(c => [c, CARE_CONTEXT_LABEL[c]] as const)} value={draft.care_contexts ?? []} onChange={v => set("care_contexts", v)} />
      <Chips label="Roles (none picked = everyone)" options={CARE_ROLES} value={draft.care_roles ?? []} onChange={v => set("care_roles", v)} />
      <div><Label>Intensity</Label><Select value={draft.care_intensity ?? "none"} onValueChange={v => set("care_intensity", v === "none" ? null : v)}>
        <SelectTrigger aria-label="Intensity"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="moderate">Moderate (never on recovery or low days)</SelectItem></SelectContent>
      </Select></div>
      {!((draft.care_areas ?? []).length && (draft.care_types ?? []).length) && <p className="col-span-2 text-xs text-muted-foreground">Without a body area and movement type, this only stands in for the Recovery card's "Mobility + foam roll" (the old way).</p>}
    </>}
    {problems.length > 0 && <p className="col-span-2 text-xs text-destructive">Still needs: {problems.join(", ")}.</p>}
  </div>;
}
