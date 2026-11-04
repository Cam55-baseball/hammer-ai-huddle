import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CATCH_PLAY_SETTING_KEY, PROPOSED_ARM_RISK_FAULTS, THROWING_FAULT_KEYS, catchPlayStandardsFrom, type CatchPlayStandards,
} from "../../../supabase/functions/_shared/wic/throwing/catchPlay";

const db = supabase as any;
type NumField = { label: string; get: (s: CatchPlayStandards) => number; set: (s: CatchPlayStandards, v: number) => CatchPlayStandards };
const f = (label: string, path: string[]): NumField => ({
  label,
  get: (s) => path.reduce((o: any, k) => o[k], s),
  set: (s, v) => { const c = structuredClone(s) as any; let o = c; path.slice(0, -1).forEach((k) => (o = o[k])); o[path.at(-1)!] = v; return c; },
});
const FIELDS: { group: string; fields: NumField[] }[] = [
  { group: "Position distance (ft) — baseball", fields: (["1B", "IF", "C", "OF"] as const).map((p) => f(p, ["positionDistanceFt", "baseball", p])) },
  { group: "Position distance (ft) — softball", fields: (["1B", "IF", "C", "OF"] as const).map((p) => f(p, ["positionDistanceFt", "softball", p])) },
  { group: "Max long-toss distance cap (ft)", fields: [f("Baseball IF/C", ["maxDistanceCapFt", "baseball", "IF"]), f("Baseball OF", ["maxDistanceCapFt", "baseball", "OF"]), f("Softball IF/C", ["maxDistanceCapFt", "softball", "IF"]), f("Softball OF", ["maxDistanceCapFt", "softball", "OF"]), f("Under 11", ["youthMaxDistanceFt", "under11"]), f("Age 11–12", ["youthMaxDistanceFt", "age11to12"])] },
  { group: "Long-toss days a week", fields: (["off", "pre", "in", "post"] as const).map((p) => f(`${p}-season`, ["longTossPerWeek", p])) },
  { group: "Arm-strength days a week", fields: (["off", "pre", "in", "post"] as const).map((p) => f(`${p}-season`, ["armStrengthPerWeek", p])) },
  { group: "Pull-downs", fields: [f("Adult start", ["pullDowns", "adultStart"]), f("Adult max", ["pullDowns", "adultMax"]), f("13–18 start", ["pullDowns", "teenStart"]), f("13–18 max", ["pullDowns", "teenMax"]), f("Under 13 min", ["pullDowns", "youthMin"]), f("Under 13 max", ["pullDowns", "youthMax"]), f("Added per green step", ["pullDowns", "stepPerGreenWeek"])] },
  { group: "Earning and build-up", fields: [f("Green sessions in a row", ["greenSessions"]), f("Youth/teen slower ×", ["youthGreenMultiplier"]), f("Healthy check-in days", ["healthyCheckinDays"]), f("Throwing clip fresh (days)", ["analysisFreshDays"]), f("Regress at least (days)", ["regressDays"]), f("Layoff starts build-up (days)", ["buildUpLayoffDays"]), f("Healed within (days)", ["buildUpHealedWithinDays"])] },
];

/** Owner Nov 4 r3 Part B: catch play in throws — editable starting standards and the arm-risk list. */
export function CatchPlaySettings() {
  const [draft, setDraft] = useState<CatchPlayStandards | null>(null);
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: ["catch-play-standards"], queryFn: async () => {
    const r = await db.from("app_settings").select("setting_value").eq("setting_key", CATCH_PLAY_SETTING_KEY).maybeSingle();
    if (r.error) throw r.error;
    return { exists: !!r.data, standards: catchPlayStandardsFrom(r.data?.setting_value), reviewed: !!r.data?.setting_value?.armRiskFaults };
  } });
  useEffect(() => { if (q.data) setDraft(q.data.standards); }, [q.data]);

  async function save() {
    if (!draft) return;
    const r = q.data?.exists
      ? await db.from("app_settings").update({ setting_value: draft }).eq("setting_key", CATCH_PLAY_SETTING_KEY)
      : await db.from("app_settings").insert({ setting_key: CATCH_PLAY_SETTING_KEY, setting_value: draft });
    if (r.error) { setMsg("Couldn't save. Your changes are still here."); return; }
    const back = await q.refetch();
    const same = back.data && JSON.stringify(back.data.standards) === JSON.stringify(catchPlayStandardsFrom(draft));
    setMsg(same ? "Saved and read back." : "Saved, but some values were outside the safe range and kept their defaults.");
  }

  const toggle = (key: string) => setDraft((d) => d && ({ ...d, armRiskFaults: d.armRiskFaults.includes(key) ? d.armRiskFaults.filter((k) => k !== key) : [...d.armRiskFaults, key] }));

  return <section aria-label="Catch play in throws" className="space-y-4 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Catch play in throws</h2>
    <p className="text-sm text-muted-foreground">Starting standards for catch play, long toss and arm-strength days. Every throw counts in the arm budget. Owner ceilings always hold: long toss at most 3 a week pre-season and 2 in-season; arm strength at most 2 a week off/pre-season and 1 in-season; pull-downs at most 15 (5 under 13).</p>
    {q.isError ? <p role="alert" className="text-sm text-destructive">Couldn't read the saved setting.</p> : !draft ? <p className="text-sm text-muted-foreground">Loading…</p> : <>
      {FIELDS.map((g) => <fieldset key={g.group} className="space-y-2">
        <legend className="text-sm font-semibold">{g.group}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {g.fields.map((x) => { const id = `cp-${g.group}-${x.label}`.replace(/\W+/g, "-"); return <div key={x.label} className="space-y-1">
            <Label htmlFor={id} className="text-xs">{x.label}</Label>
            <Input id={id} type="number" value={x.get(draft)} onChange={(e) => setDraft(x.set(draft, Number(e.target.value)))} />
          </div>; })}
        </div>
      </fieldset>)}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Arm-risk mechanics (block long toss and arm-strength days)</legend>
        {!q.data?.reviewed && <Badge variant="outline">Proposed default — for your review</Badge>}
        <div className="grid gap-2 sm:grid-cols-2">
          {THROWING_FAULT_KEYS.map((k) => <label key={k.key} className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.armRiskFaults.includes(k.key)} onCheckedChange={() => toggle(k.key)} aria-label={k.label} />
            {k.label}{PROPOSED_ARM_RISK_FAULTS.includes(k.key) && <span className="text-xs text-muted-foreground">(proposed)</span>}
          </label>)}
        </div>
      </fieldset>
      <Button onClick={() => void save()} disabled={q.isPending}>Save catch-play standards</Button>
    </>}
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
