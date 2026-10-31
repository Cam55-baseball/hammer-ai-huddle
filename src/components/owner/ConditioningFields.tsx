import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROGRAMS, YARD_KINDS, ownerConditioningProblems } from "../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";
import { ROLE_FIT } from "./PitcherTagFields";
import type { OwnerDrillRow } from "@/lib/prescription/ownerDrills";

type Draft = Partial<OwnerDrillRow> & { sports: string[]; contacts?: number | null; load_lbs?: number | null; carry_yards?: number | null; conditioning_programs?: string[] };

export const CONDITIONING_KINDS = [
  ["sprint", "Sprints (yards)"], ["shuttle", "Shuttles (yards)"], ["run", "Run (set distance)"], ["base_route", "Base route"],
  ["jump", "Jumping (contacts)"], ["carry", "Carries (yards, load, time)"], ["sled", "Sled push / pull (yards, load)"],
] as const;

function Chips({ label, options, value, onChange }: { label: string; options: readonly (readonly [string, string])[]; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="col-span-2"><Label>{label}</Label><div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label}>
    {options.map(([k, l]) => { const on = value.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== k) : [...value, k])}><Badge variant={on ? "default" : "outline"}>{l}</Badge></button>; })}
  </div></div>;
}

/** Owner Oct 31: any conditioning drill, with the right measure for its kind, aimed at programs and pitcher roles. */
export function ConditioningFields({ draft, set }: { draft: Draft; set: (k: string, v: unknown) => void }) {
  const kind = draft.conditioning_kind ?? null;
  const num = (k: string, label: string, aria: string) => <div><Label>{label}</Label><Input aria-label={aria} type="number" inputMode="numeric" value={(draft as any)[k] ?? ''} onChange={e => set(k, e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div>;
  const programs = draft.conditioning_programs ?? [];
  const problems = kind ? ownerConditioningProblems(draft as any) : [];
  return <div className="grid grid-cols-2 gap-2 sm:col-span-2">
    <div className="col-span-2"><Label>Conditioning type</Label><Select value={kind ?? 'none'} onValueChange={value => { set('conditioning_kind', value === 'none' ? null : value); if (value === 'base_route' && draft.sports.length === 1) set('base_distance_feet', draft.sports[0] === 'softball' ? 60 : 90); }}><SelectTrigger aria-label="Conditioning type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem>{CONDITIONING_KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
    {num('rounds', 'Rounds', 'Rounds')}
    {kind === 'jump' ? num('contacts', 'Contacts per round', 'Contacts per round') : kind === 'carry' || kind === 'sled' ? <>
      {num('carry_yards', 'Yards per round', 'Yards per round')}
      <div><Label>Load (lb)</Label><Input aria-label="Load in pounds" type="number" inputMode="decimal" value={draft.load_lbs ?? ''} onChange={e => set('load_lbs', e.target.value === '' ? null : Number(e.target.value))} /></div>
      {kind === 'carry' && num('work_seconds', 'Carry time (seconds)', 'Work time in seconds')}
    </> : kind === 'base_route' ? <>
      {num('work_seconds', 'Work time (seconds)', 'Work time in seconds')}
      {num('bases_per_rep', 'Bases per rep (1–4)', 'Bases per rep')}
      <div><Label>Base distance</Label><Select value={String(draft.base_distance_feet ?? 'none')} onValueChange={value => set('base_distance_feet', value === 'none' ? null : Number(value))}><SelectTrigger aria-label="Base distance"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="90">30 yd (baseball)</SelectItem><SelectItem value="60">20 yd (softball)</SelectItem></SelectContent></Select></div>
    </> : <>
      {num('work_seconds', 'Work time (seconds)', 'Work time in seconds')}
      <div><Label>Distance (yards)</Label><Input aria-label="Distance in yards" type="number" inputMode="numeric" value={draft.distance_feet != null ? Math.round(draft.distance_feet / 3) : ''} onChange={e => set('distance_feet', e.target.value === '' ? null : Math.round(Number(e.target.value)) * 3)} /></div>
    </>}
    {num('rest_seconds', 'Rest time (seconds)', 'Rest time in seconds')}
    <Chips label="Programs (none picked = all subscribers)" options={PROGRAMS} value={programs} onChange={v => set('conditioning_programs', v)} />
    <Chips label="Pitcher role fit (none picked = every role)" options={ROLE_FIT} value={draft.pitch_role_fit ?? []} onChange={v => set('pitch_role_fit', v)} />
    <p className="col-span-2 text-xs text-muted-foreground">{kind === 'jump' ? 'Jump contacts count toward the plyo contact limits.' : kind && YARD_KINDS.has(kind) ? 'Counts toward the 1000-yard session limit. ' : ''}Runs rest at least 1 minute per 10 yards (up to 5 minutes); base routes rest 30 seconds and 5 minutes after every 4 bases. Low readiness halves the rounds.</p>
    {problems.length > 0 && <p className="col-span-2 text-xs text-destructive">Still needs: {problems.join(', ')}.</p>}
  </div>;
}
