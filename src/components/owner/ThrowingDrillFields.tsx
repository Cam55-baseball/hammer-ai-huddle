/** Owner Nov 5 round 2 item 4 — throwing-specific fields for a "Throwing drill". */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarmupFitPicker } from "@/components/owner/WarmupFitPicker";
import { defaultFitForNewItem } from "@/lib/hammer/prescription/warmupFit";
import { THROW_CONTEXTS, THROW_INTENTS, THROW_ROLES, ownerThrowingProblems, throwSteps, type ThrowStep } from "@/lib/prescription/ownerThrowingDrills";

type D = Record<string, any>;
const ARM_TAX = ["low", "moderate", "high"] as const;

export function ThrowingDrillFields({ draft, set }: { draft: D; set: (k: string, v: unknown) => void }) {
  const steps: ThrowStep[] = Array.isArray(draft.throw_steps) ? draft.throw_steps : [];
  const putStep = (i: number, patch: Partial<ThrowStep>) => set("throw_steps", steps.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const toggle = (k: string, id: string, on: boolean) => set(k, on ? [...(draft[k] ?? []), id] : (draft[k] ?? []).filter((x: string) => x !== id));
  const def = defaultFitForNewItem(null);
  const fit = { levels: (draft.fit_levels?.length ? draft.fit_levels : def.levels), ageBands: (draft.fit_age_bands?.length ? draft.fit_age_bands : def.ageBands) };
  const problems = ownerThrowingProblems({ ...draft, fit_levels: fit.levels, fit_age_bands: fit.ageBands } as never);
  return (
    <div className="space-y-3 rounded-md border p-3 sm:col-span-2" data-testid="throwing-drill-fields">
      <p className="text-sm font-semibold">Throwing drill</p>
      <div className="space-y-2">
        <Label>Steps (distance × throws)</Label>
        {steps.map((s, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <div><Label htmlFor={`ts-ft-${i}`} className="text-xs">Distance (ft)</Label><Input id={`ts-ft-${i}`} type="number" inputMode="numeric" className="w-24" value={s.ft || ""} onChange={(e) => putStep(i, { ft: Number(e.target.value) })} /></div>
            <div><Label htmlFor={`ts-n-${i}`} className="text-xs">Throws</Label><Input id={`ts-n-${i}`} type="number" inputMode="numeric" className="w-20" value={s.throws || ""} onChange={(e) => putStep(i, { throws: Number(e.target.value) })} /></div>
            {draft.throw_pulldowns && <div><Label htmlFor={`ts-pd-${i}`} className="text-xs">Pull-down throws</Label><Input id={`ts-pd-${i}`} type="number" inputMode="numeric" className="w-24" value={s.pulldownThrows ?? ""} onChange={(e) => putStep(i, { pulldownThrows: e.target.value ? Number(e.target.value) : null })} /></div>}
            <Button type="button" size="icon" variant="ghost" aria-label={`Remove step ${i + 1}`} onClick={() => set("throw_steps", steps.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => set("throw_steps", [...steps, { ft: 0, throws: 0 }])}><Plus className="mr-1 h-4 w-4" />Add step</Button>
      </div>
      <Choice label="Intent" options={THROW_INTENTS} value={draft.throw_intent} onPick={(v) => set("throw_intent", v)} />
      <Choice label="Flight" options={[{ id: "arc", label: "Arc" }, { id: "line", label: "On a line" }]} value={draft.throw_flight} onPick={(v) => set("throw_flight", v)} />
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!draft.throw_pulldowns} onCheckedChange={(c) => set("throw_pulldowns", !!c)} />Pull-downs</label>
      <Checks label="Where it's prescribed" options={THROW_CONTEXTS} value={draft.throw_contexts ?? []} onToggle={(id, on) => toggle("throw_contexts", id, on)} />
      <Checks label="Role fit" options={THROW_ROLES} value={draft.throw_role_fit ?? []} onToggle={(id, on) => toggle("throw_role_fit", id, on)} />
      <Choice label="Arm-tax level" options={ARM_TAX.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }))} value={draft.arm_tax_level} onPick={(v) => set("arm_tax_level", v)} />
      <WarmupFitPicker value={fit as never} onChange={(n) => { set("fit_levels", n.levels); set("fit_age_bands", n.ageBands); }} />
      <p className="text-xs text-muted-foreground">Total: {throwSteps(steps).reduce((n, s) => n + s.throws + (draft.throw_pulldowns ? s.pulldownThrows ?? 0 : 0), 0)} throws. Every throw counts toward the arm limit and is logged only with the "Log throwing practice" button.</p>
      <p className={problems.length ? "text-xs text-destructive" : "text-xs text-primary"}>{problems.length ? `Still needs: ${problems.join(", ")}` : "Ready — the plan can prescribe it where it fits."}</p>
    </div>
  );
}

function Choice({ label, options, value, onPick }: { label: string; options: ReadonlyArray<{ id: string; label: string }>; value: string | null | undefined; onPick: (v: string) => void }) {
  return <div><Label>{label}</Label><div className="mt-1 flex flex-wrap gap-2">{options.map((o) => <Button key={o.id} type="button" size="sm" variant={value === o.id ? "default" : "outline"} aria-pressed={value === o.id} onClick={() => onPick(o.id)}>{o.label}</Button>)}</div></div>;
}
function Checks({ label, options, value, onToggle }: { label: string; options: ReadonlyArray<{ id: string; label: string }>; value: string[]; onToggle: (id: string, on: boolean) => void }) {
  return <div><Label>{label}</Label><div className="mt-1 flex flex-wrap gap-3">{options.map((o) => <label key={o.id} className="flex items-center gap-2 text-sm"><Checkbox checked={value.includes(o.id)} onCheckedChange={(c) => onToggle(o.id, !!c)} />{o.label}</label>)}</div></div>;
}
