import { useState } from "react";
import { useWorkoutCatalog } from "@/hooks/useWorkoutCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ownerGear } from "../../../supabase/functions/_shared/vault/ownerDefaults";
import { COMMON_SWAP_GEAR } from "../../../supabase/functions/_shared/planSwap/commonGear";
import type { Exercise } from "@/types/customActivity";

export function CoachExerciseAuthoring({ exercises, onChange }: { exercises: Exercise[]; onChange: (items: Exercise[]) => void }) {
  const catalog = useWorkoutCatalog();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const items = (catalog.data ?? []).filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  const update = (id: string, values: Partial<Exercise>) => onChange(exercises.map(e => e.id === id ? { ...e, ...values } : e));
  const addCatalog = () => {
    const row = items.find(item => item.slug === selected);
    if (!row) return;
    onChange([...exercises, { id: crypto.randomUUID(), name: row.name, slug: row.slug, type: "other",
      sets: row.default_sets ?? undefined, reps: row.default_reps ?? undefined,
      duration: row.default_duration_seconds ?? undefined, dosage_unit: row.dosage_unit ?? undefined,
      equipment_requirements: [...(row.equipment ?? []), ...(row.equipment_requirements ?? [])],
      equipment_alternatives: row.equipment_alternatives ?? undefined,
      gear: [...(row.equipment ?? []), ...(row.equipment_requirements ?? [])].join(", ") }]);
  };
  return <section className="space-y-3" aria-label="Workout items">
    <Label className="font-bold">Workout items</Label>
    <Input aria-label="Search Exercise Vault" placeholder="Search Exercise Vault" value={search} onChange={e => setSearch(e.target.value)} />
    {catalog.error ? <p role="alert" className="text-sm text-destructive">Couldn't load Exercise Vault. Try again.</p> : <select aria-label="Exercise Vault item" value={selected} onChange={e => setSelected(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">
      <option value="">{catalog.isLoading ? "Loading Exercise Vault…" : "Choose an exercise"}</option>
      {items.map(row => <option key={row.id} value={row.slug}>{row.name} · {row.dosage_unit ?? "measure not declared"}</option>)}
    </select>}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={!selected} onClick={addCatalog}><Plus className="mr-1 h-4 w-4" />Add selected</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...exercises, { id: crypto.randomUUID(), name: "", type: "other" }])}><Plus className="mr-1 h-4 w-4" />My own item</Button></div>
    <datalist id="coach-common-gear">{COMMON_SWAP_GEAR.map(gear => <option key={gear} value={gear.replace(/_/g, " ")} />)}</datalist>
    {exercises.map(e => <div key={e.id} className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center gap-2"><Input aria-label="Exercise name" value={e.name} onChange={event => update(e.id, { name: event.target.value, slug: undefined })} /><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${e.name || "item"}`} onClick={() => onChange(exercises.filter(item => item.id !== e.id))}><Trash2 className="h-4 w-4" /></Button></div>
      <div className="grid grid-cols-2 gap-2"><Label className="space-y-1 text-xs">Sets<Input type="number" min="1" value={e.sets ?? ""} onChange={event => update(e.id, { sets: event.target.value ? Number(event.target.value) : undefined })} /></Label>
        <Label className="space-y-1 text-xs">Measure<select aria-label={`Measure for ${e.name}`} value={e.dosage_unit ?? ""} onChange={event => update(e.id, { dosage_unit: event.target.value })} className="w-full rounded-md border border-input bg-background p-2"><option value="">Choose measure</option>{["reps", "throws", "seconds", "feet"].map(unit => <option key={unit}>{unit}</option>)}</select></Label>
        <Label className="space-y-1 text-xs">{e.dosage_unit === "seconds" ? "Time target (seconds)" : e.dosage_unit === "feet" ? "Distance (feet)" : e.dosage_unit === "throws" ? "Throws per set" : "Reps per set"}<Input type="number" min="0" step={e.dosage_unit === "seconds" ? "0.01" : "1"} value={(e.dosage_unit === "seconds" ? e.duration : e.dosage_unit === "feet" ? e.distance_feet : e.reps) ?? ""} onChange={event => { const value = event.target.value ? Number(event.target.value) : undefined; update(e.id, e.dosage_unit === "seconds" ? { duration: value } : e.dosage_unit === "feet" ? { distance_feet: value } : { reps: value }); }} /></Label>
        <Label className="space-y-1 text-xs">Rest (seconds)<Input type="number" min="0" value={e.rest ?? ""} onChange={event => update(e.id, { rest: event.target.value ? Number(event.target.value) : undefined })} /></Label></div>
      <Label className="block space-y-1 text-xs">Gear<Input list="coach-common-gear" value={e.gear ?? ""} onChange={event => update(e.id, { gear: event.target.value, equipment_requirements: ownerGear(event.target.value.split(",")).equipment })} /></Label>
      {e.equipment_alternatives?.length ? <p className="text-xs text-muted-foreground">One complete setup: {e.equipment_alternatives.map(group => group.join(" + ")).join(" or ")}</p> : null}
    </div>)}
  </section>;
}