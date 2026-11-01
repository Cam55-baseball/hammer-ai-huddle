import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROGRAMS } from "../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";
import { CARE_MEASURES, careMeasureProblems } from "@/lib/prescription/ownerPlanDrills";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

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
    {problems.length > 0 && <p className="col-span-2 text-xs text-destructive">Still needs: {problems.join(", ")}.</p>}
  </div>;
}
