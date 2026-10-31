import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FULL_DISTANCE_FT, SHORTBOX_FRACTION } from "../../../supabase/functions/_shared/wic/pitching/roleCycle";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

export const MOUND_TYPES = [
  ["full_bullpen", "Full bullpen"], ["light_mound", "Light mound catch"], ["shortbox", "Shortbox (mound)"],
  ["flat_ground", "Flat ground"], ["circle", "Circle (softball)"], ["shortbox_circle", "Shortbox circle (softball)"],
] as const;
export const PITCH_PURPOSES = [["command", "Command"], ["mechanics", "Mechanics"], ["velocity", "Velocity"], ["recovery", "Recovery"], ["throwing_mobility", "Throwing mobility"]] as const;
export const ROLE_FIT = [["starter", "Starter"], ["bullpen", "Bullpen arm"], ["closer", "Closer"]] as const;
const PITCH_TYPES = ["fastball", "changeup", "curveball", "slider", "cutter", "riseball", "dropball", "screwball"];

type Draft = Partial<OwnerDrillRow> & { sports: string[] };

function Chips({ label, options, value, onChange }: { label: string; options: readonly (readonly [string, string])[]; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="sm:col-span-2"><Label>{label}</Label><div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label}>
    {options.map(([k, l]) => { const on = value.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== k) : [...value, k])}><Badge variant={on ? "default" : "outline"}>{l}</Badge></button>; })}
  </div></div>;
}

/** Owner Oct 31: pitcher tags the plan engine reads to place mound/circle work. */
export function PitcherTagFields({ draft, set }: { draft: Draft; set: (k: string, v: unknown) => void }) {
  const softball = draft.sports.length === 1 && draft.sports[0] === "softball";
  const full = FULL_DISTANCE_FT[softball ? "softball" : "baseball"];
  const shortbox = draft.pitch_mound_type === "shortbox" || draft.pitch_mound_type === "shortbox_circle";
  const num = (v: string) => (v === "" ? null : Number(v));
  return <fieldset className="grid grid-cols-2 gap-2 rounded-md border border-border/60 p-3 sm:col-span-2" aria-label="Pitcher tags">
    <legend className="px-1 text-sm font-semibold">Pitcher tags</legend>
    <div><Label>Mound type</Label><Select value={draft.pitch_mound_type ?? "none"} onValueChange={v => { set("pitch_mound_type", v === "none" ? null : v); if (v === "shortbox" || v === "shortbox_circle") { set("pitch_distance_fraction", Math.round(SHORTBOX_FRACTION * 100) / 100); set("pitch_distance_feet", Math.round(FULL_DISTANCE_FT[v === "shortbox_circle" ? "softball" : "baseball"] * SHORTBOX_FRACTION)); } }}>
      <SelectTrigger aria-label="Mound type"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">Not a pitching drill</SelectItem>{MOUND_TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
    <div><Label>Intensity</Label><Select value={draft.pitch_intensity ?? "none"} onValueChange={v => set("pitch_intensity", v === "none" ? null : v)}>
      <SelectTrigger aria-label="Pitch intensity"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="catch_light">Catch-light</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent></Select></div>
    {shortbox && <div><Label>Distance fraction</Label><Input aria-label="Distance fraction" type="number" step="0.01" value={draft.pitch_distance_fraction ?? ""} onChange={e => { const f = num(e.target.value); set("pitch_distance_fraction", f); if (f) set("pitch_distance_feet", Math.round(full * f)); }} /></div>}
    <div><Label>Distance (feet)</Label><Input aria-label="Pitch distance in feet" type="number" value={draft.pitch_distance_feet ?? ""} onChange={e => set("pitch_distance_feet", num(e.target.value))} /></div>
    <div><Label>Pitch count</Label><Input aria-label="Pitch count" type="number" inputMode="numeric" value={draft.pitch_count ?? ""} onChange={e => set("pitch_count", e.target.value === "" ? null : Math.round(Number(e.target.value)))} /></div>
    <div><Label>Arm-tax level</Label><Select value={draft.arm_tax_level ?? "none"} onValueChange={v => set("arm_tax_level", v === "none" ? null : v)}>
      <SelectTrigger aria-label="Arm-tax level"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
    <Chips label="Pitch types" options={PITCH_TYPES.map(p => [p, p[0].toUpperCase() + p.slice(1)] as const)} value={draft.pitch_types ?? []} onChange={v => set("pitch_types", v)} />
    <Chips label="Purpose" options={PITCH_PURPOSES} value={draft.pitch_purposes ?? []} onChange={v => set("pitch_purposes", v)} />
    <Chips label="Role fit" options={ROLE_FIT} value={draft.pitch_role_fit ?? []} onChange={v => set("pitch_role_fit", v)} />
    <p className="text-xs text-muted-foreground sm:col-span-2">Sport comes from the drill's sports above. Every pitch still counts in the arm budget at its real intensity.</p>
  </fieldset>;
}
