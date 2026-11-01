import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CARE_AREAS, CARE_AREA_LABEL, CARE_TYPES, CARE_TYPE_LABEL, CARE_CONTEXTS, CARE_CONTEXT_LABEL, CARE_TIER_LABEL,
  CARE_CONFIG_KEY, DEFAULT_CARE_CONFIG, careConfigFrom, rankCare, builtinCareTags,
  type CareArea, type CareContext, type CareMatchConfig, type CareType, type CareItem,
} from "../../../supabase/functions/_shared/tissueCare/matching";
import { ownerCareItem } from "@/lib/prescription/tissueCarePlan";
import { WARMUP_LIBRARY } from "@/lib/hammer/prescription/warmupLibrary";
import { setTissueCareConfig } from "@/lib/prescription/tissueCarePlan";

const db = supabase as any;

/** Owner Nov 1: edit compatible types + related areas, and preview what a slot would pick. */
export function TissueCareMatchingSettings() {
  const [cfg, setCfg] = useState<CareMatchConfig>(DEFAULT_CARE_CONFIG);
  const [msg, setMsg] = useState("");
  const [area, setArea] = useState<CareArea>("shoulders");
  const [type, setType] = useState<CareType>("foam_roll");
  const [context, setContext] = useState<CareContext>("pre_throwing");
  const [sport, setSport] = useState("baseball");
  const q = useQuery({ queryKey: ["tissue-care-matching"], queryFn: async () => {
    const [s, o] = await Promise.all([
      db.from("app_settings").select("setting_value").eq("setting_key", CARE_CONFIG_KEY).maybeSingle(),
      db.from("owner_drills").select("*").eq("active", true).contains("placements", ["hammers_today:tissue_care"]).limit(500),
    ]);
    if (s.error || o.error) throw s.error ?? o.error;
    return { exists: !!s.data, cfg: careConfigFrom(s.data?.setting_value), owner: (o.data ?? []) as any[] };
  } });
  useEffect(() => { if (q.data) setCfg(q.data.cfg); }, [q.data]);

  const pool = useMemo<CareItem[]>(() => [
    ...(q.data?.owner ?? []).map(ownerCareItem),
    ...WARMUP_LIBRARY.flatMap((d) => { const t = builtinCareTags({ name: d.name, role: d.role, setup: d.setup }); return t && d.role !== "arm_care" ? [{ id: d.slug, name: `${d.name} (built-in)`, areas: t.areas, types: t.types, origin: "builtin" as const }] : []; }),
  ], [q.data]);
  const preview = rankCare({ areas: [area], type, context, sport }, pool, cfg).slice(0, 6);

  const togglePair = (a: CareType, b: CareType) => {
    const has = cfg.compatible.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
    setCfg({ ...cfg, compatible: has ? cfg.compatible.filter((p) => !((p.a === a && p.b === b) || (p.a === b && p.b === a))) : [...cfg.compatible, { a, b }] });
  };
  const toggleWarmOnly = (i: number) => setCfg({ ...cfg, compatible: cfg.compatible.map((p, j) => j === i ? { ...p, warmupOnly: !p.warmupOnly } : p) });
  const toggleRelated = (a: CareArea, b: CareArea) => {
    const on = !!cfg.related[a]?.includes(b) || !!cfg.related[b]?.includes(a);
    const rel = { ...cfg.related };
    if (on) { rel[a] = (rel[a] ?? []).filter((x) => x !== b); rel[b] = (rel[b] ?? []).filter((x) => x !== a); }
    else rel[a] = [...(rel[a] ?? []), b];
    setCfg({ ...cfg, related: rel });
  };
  const [relFrom, setRelFrom] = useState<CareArea>("shoulders");
  const [pairA, setPairA] = useState<CareType>("foam_roll");

  async function save(next: CareMatchConfig) {
    const r = q.data?.exists
      ? await db.from("app_settings").update({ setting_value: next }).eq("setting_key", CARE_CONFIG_KEY)
      : await db.from("app_settings").insert({ setting_key: CARE_CONFIG_KEY, setting_value: next });
    if (r.error) { setMsg("Couldn't save. Your changes are still here."); return; }
    const back = await q.refetch();
    if (back.data) { setTissueCareConfig(back.data.cfg); setMsg("Saved and read back. New plans use these matches."); } else setMsg("Saved, but couldn't read back.");
  }

  return <section aria-label="Tissue care matching" className="space-y-4 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Tissue care matching</h2>
    <p className="text-sm text-muted-foreground">Your tissue care activities replace built-in ones by body area and movement type. Order: exact → same area, close type → nearby area → same type anywhere. Nothing else is ever forced in.</p>
    {q.isError && <p role="alert" className="text-sm text-destructive">Couldn't read the saved setting.</p>}

    <div className="space-y-2"><h3 className="font-medium">Close movement types</h3>
      <div className="flex flex-wrap gap-2">{cfg.compatible.map((p, i) => <span key={`${p.a}-${p.b}`} className="flex items-center gap-1">
        <Badge variant="secondary">{CARE_TYPE_LABEL[p.a]} ↔ {CARE_TYPE_LABEL[p.b]}{p.warmupOnly ? " (warm-ups only)" : ""}</Badge>
        <Button size="sm" variant="ghost" onClick={() => toggleWarmOnly(i)}>{p.warmupOnly ? "Allow everywhere" : "Warm-ups only"}</Button>
        <Button size="sm" variant="ghost" onClick={() => togglePair(p.a, p.b)}>Remove</Button></span>)}</div>
      <div className="flex flex-wrap items-center gap-1"><Select value={pairA} onValueChange={(v) => setPairA(v as CareType)}><SelectTrigger className="w-40" aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{CARE_TYPES.map((t) => <SelectItem key={t} value={t}>{CARE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select>
        {CARE_TYPES.filter((t) => t !== pairA).map((t) => { const on = cfg.compatible.some((p) => (p.a === pairA && p.b === t) || (p.a === t && p.b === pairA)); return <button key={t} type="button" aria-pressed={on} onClick={() => togglePair(pairA, t)}><Badge variant={on ? "default" : "outline"}>{CARE_TYPE_LABEL[t]}</Badge></button>; })}</div>
    </div>

    <div className="space-y-2"><h3 className="font-medium">Nearby body areas</h3>
      <div className="flex flex-wrap items-center gap-1"><Select value={relFrom} onValueChange={(v) => setRelFrom(v as CareArea)}><SelectTrigger className="w-44" aria-label="Area"><SelectValue /></SelectTrigger><SelectContent>{CARE_AREAS.filter((a) => a !== "full_body").map((a) => <SelectItem key={a} value={a}>{CARE_AREA_LABEL[a]}</SelectItem>)}</SelectContent></Select>
        {CARE_AREAS.filter((a) => a !== relFrom && a !== "full_body").map((a) => { const on = !!cfg.related[relFrom]?.includes(a) || !!cfg.related[a]?.includes(relFrom); return <button key={a} type="button" aria-pressed={on} onClick={() => toggleRelated(relFrom, a)}><Badge variant={on ? "default" : "outline"}>{CARE_AREA_LABEL[a]}</Badge></button>; })}</div>
    </div>

    <div className="flex gap-2"><Button onClick={() => void save(cfg)} disabled={q.isPending || q.isError}>Save matching</Button>
      <Button variant="outline" onClick={() => { setCfg(DEFAULT_CARE_CONFIG); }}>Back to approved defaults</Button></div>
    {msg && <p role="status" className="text-sm">{msg}</p>}

    <div className="space-y-2 rounded-md border border-border p-3"><h3 className="font-medium">Preview (uses the settings above, saved or not)</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div><Label>Area</Label><Select value={area} onValueChange={(v) => setArea(v as CareArea)}><SelectTrigger aria-label="Preview area"><SelectValue /></SelectTrigger><SelectContent>{CARE_AREAS.map((a) => <SelectItem key={a} value={a}>{CARE_AREA_LABEL[a]}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Type</Label><Select value={type} onValueChange={(v) => setType(v as CareType)}><SelectTrigger aria-label="Preview type"><SelectValue /></SelectTrigger><SelectContent>{CARE_TYPES.map((t) => <SelectItem key={t} value={t}>{CARE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Where</Label><Select value={context} onValueChange={(v) => setContext(v as CareContext)}><SelectTrigger aria-label="Preview context"><SelectValue /></SelectTrigger><SelectContent>{CARE_CONTEXTS.map((c) => <SelectItem key={c} value={c}>{CARE_CONTEXT_LABEL[c]}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Sport</Label><Select value={sport} onValueChange={setSport}><SelectTrigger aria-label="Preview sport"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baseball">Baseball</SelectItem><SelectItem value="softball">Softball</SelectItem></SelectContent></Select></div>
      </div>
      {preview.length === 0 ? <p className="text-sm text-muted-foreground">No fitting match — the built-in movement stays.</p>
        : <ol className="list-decimal space-y-1 pl-5 text-sm">{preview.map((m) => <li key={m.item.id}><span className="font-medium">{m.item.name}</span> — {CARE_TIER_LABEL[m.tier]}</li>)}</ol>}
    </div>
  </section>;
}
