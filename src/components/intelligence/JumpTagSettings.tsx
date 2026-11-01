import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  JUMP_CLASSES, JUMP_MECHANICS, JUMP_INTENSITIES, JUMP_DIRECTIONS, JUMP_STANCES, JUMP_EXECUTIONS, JUMP_LANDINGS, JUMP_LOADS,
  JUMP_OBJECTIVES, JUMP_LEVELS, CONTACT_METHODS, JUMP_SPORTS, JUMP_ROLES, JUMP_LABELS, jumpTagProblems, type JumpRow,
} from "../../../supabase/functions/_shared/wic/jumps/taxonomy";

const db = supabase as any;
const VOCAB_KEY = "jump_tag_vocabulary";
const COLS = "slug,name,plyo_tier,contacts_per_rep,min_age_years,default_sets,default_reps,jump_class,jump_mechanics,jump_intensity,jump_direction,jump_stance,jump_execution,jump_landing_strategy,jump_load,jump_objectives,jump_level,jump_min_readiness,contact_method,jump_sport_tags,jump_role_tags,jump_rest_seconds";
type Dim = { key: keyof JumpRow; label: string; base: readonly string[]; many: boolean };
const DIMS: Dim[] = [
  { key: "jump_class", label: "Primary class", base: JUMP_CLASSES, many: true },
  { key: "jump_mechanics", label: "Force mechanics", base: JUMP_MECHANICS, many: true },
  { key: "jump_intensity", label: "Intensity", base: JUMP_INTENSITIES, many: false },
  { key: "jump_direction", label: "Direction", base: JUMP_DIRECTIONS, many: true },
  { key: "jump_stance", label: "Stance", base: JUMP_STANCES, many: false },
  { key: "jump_execution", label: "Execution", base: JUMP_EXECUTIONS, many: false },
  { key: "jump_landing_strategy", label: "Landing", base: JUMP_LANDINGS, many: false },
  { key: "jump_load", label: "External load", base: JUMP_LOADS, many: false },
  { key: "jump_objectives", label: "Training objective", base: JUMP_OBJECTIVES, many: true },
  { key: "jump_level", label: "Progression level", base: JUMP_LEVELS, many: false },
  { key: "contact_method", label: "Contact counting", base: CONTACT_METHODS, many: false },
  { key: "jump_sport_tags", label: "Sport (ranks only)", base: JUMP_SPORTS, many: true },
  { key: "jump_role_tags", label: "Role (ranks only)", base: JUMP_ROLES, many: true },
];

/** Owner Nov 1 round 6: edit jump tags per exercise (and add tag values) with no code change. */
export function JumpTagSettings() {
  const [slug, setSlug] = useState<string>("");
  const [draft, setDraft] = useState<Partial<JumpRow>>({});
  const [msg, setMsg] = useState("");
  const [newVal, setNewVal] = useState<{ dim: string; value: string }>({ dim: "jump_objectives", value: "" });
  const q = useQuery({ queryKey: ["jump-tags"], queryFn: async () => {
    const [c, v] = await Promise.all([
      db.from("wk_movement_catalog").select(COLS).or("jump_level.not.is.null,movement_category.eq.jump_landing").order("name").limit(500),
      db.from("app_settings").select("setting_value").eq("setting_key", VOCAB_KEY).maybeSingle(),
    ]);
    if (c.error || v.error) throw c.error ?? v.error;
    return { rows: (c.data ?? []) as JumpRow[], extra: (v.data?.setting_value ?? {}) as Record<string, string[]>, vocabExists: !!v.data };
  } });
  const row = useMemo(() => q.data?.rows.find((r) => r.slug === slug) ?? null, [q.data, slug]);
  const val = (k: keyof JumpRow) => (k in draft ? (draft as any)[k] : row ? (row as any)[k] : null);
  const opts = (d: Dim) => [...d.base, ...(q.data?.extra[d.key as string] ?? [])];

  async function save() {
    const problems = jumpTagProblems({ ...(row ?? {}), ...draft }, q.data?.extra ?? {});
    if (problems.length) { setMsg(`Fix first: ${problems.join(", ")}`); return; }
    const r = await db.rpc("set_jump_tags", { _slug: slug, _tags: draft });
    if (r.error) { setMsg("Couldn't save. Your changes are still here."); return; }
    await q.refetch(); setDraft({}); setMsg("Saved and read back. New plans use these tags.");
  }
  async function addValue() {
    const v = newVal.value.trim().toLowerCase().replace(/\s+/g, "_");
    if (!v) return;
    const extra = { ...(q.data?.extra ?? {}) };
    extra[newVal.dim] = [...new Set([...(extra[newVal.dim] ?? []), v])];
    const r = q.data?.vocabExists ? await db.from("app_settings").update({ setting_value: extra }).eq("setting_key", VOCAB_KEY) : await db.from("app_settings").insert({ setting_key: VOCAB_KEY, setting_value: extra });
    if (r.error) { setMsg("Couldn't add the tag value."); return; }
    await q.refetch(); setNewVal({ ...newVal, value: "" }); setMsg(`Added "${v}". It's descriptive until a rule uses it.`);
  }

  return <section aria-label="Jump tags" className="space-y-3 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Jump tags</h2>
    <p className="text-sm text-muted-foreground">Every jump's class, mechanics, intensity, direction, stance, landing, load, level and contact counting. The written jump tiers, age gates and Growth Mode still apply first.</p>
    {q.isError && <p role="alert" className="text-sm text-destructive">Couldn't load jump tags.</p>}
    <div className="sm:max-w-md"><Label>Exercise</Label><Select value={slug} onValueChange={(v) => { setSlug(v); setDraft({}); setMsg(""); }}>
      <SelectTrigger aria-label="Jump exercise"><SelectValue placeholder="Pick a jump" /></SelectTrigger>
      <SelectContent>{(q.data?.rows ?? []).map((r) => <SelectItem key={r.slug} value={r.slug}>{r.name}{r.jump_level ? ` · ${JUMP_LABELS[r.jump_level] ?? r.jump_level}` : " · not tagged"}</SelectItem>)}</SelectContent>
    </Select></div>
    {row && <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Written tier: T{row.plyo_tier ?? "—"} · min age {row.min_age_years ?? "—"}</p>
      {DIMS.map((d) => <div key={d.key as string}><Label>{d.label}</Label><div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={d.label}>
        {opts(d).map((o) => { const cur = val(d.key); const on = d.many ? ((cur as string[] | null) ?? []).includes(o) : cur === o;
          return <button key={o} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, [d.key]: d.many ? (on ? ((cur as string[]) ?? []).filter((x) => x !== o) : [...((cur as string[]) ?? []), o]) : (on ? null : o) })}>
            <Badge variant={on ? "default" : "outline"}>{JUMP_LABELS[o] ?? o}</Badge></button>; })}
      </div></div>)}
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <div><Label>Minimum readiness (%)</Label><Input type="number" min={0} max={100} value={val("jump_min_readiness") == null ? "" : Math.round(Number(val("jump_min_readiness")) * 100)} onChange={(e) => setDraft({ ...draft, jump_min_readiness: e.target.value === "" ? null : Number(e.target.value) / 100 })} /></div>
        <div><Label>Rest between sets (s)</Label><Input type="number" min={0} value={val("jump_rest_seconds") ?? ""} onChange={(e) => setDraft({ ...draft, jump_rest_seconds: e.target.value === "" ? null : Number(e.target.value) })} /></div>
      </div>
      <Button onClick={() => void save()} disabled={!Object.keys(draft).length}>Save jump tags</Button>
    </div>}
    <div className="flex flex-wrap items-end gap-2"><div><Label>Add a tag value to</Label><Select value={newVal.dim} onValueChange={(v) => setNewVal({ ...newVal, dim: v })}><SelectTrigger className="w-48" aria-label="Tag group"><SelectValue /></SelectTrigger><SelectContent>{DIMS.filter((d) => d.key !== "jump_level" && d.key !== "contact_method").map((d) => <SelectItem key={d.key as string} value={d.key as string}>{d.label}</SelectItem>)}</SelectContent></Select></div>
      <Input className="w-48" aria-label="New tag value" value={newVal.value} onChange={(e) => setNewVal({ ...newVal, value: e.target.value })} placeholder="e.g. hip_hinge" />
      <Button variant="outline" onClick={() => void addValue()}>Add value</Button></div>
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
