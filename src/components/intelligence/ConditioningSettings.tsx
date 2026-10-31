import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditioningRules, CONDITIONING_RULES_KEY } from "../../../supabase/functions/_shared/wic/conditioning/yards";

const TARGETS: [string, string][] = [
  ["starterFromYards", "Starters: first-week yards"], ["starterToYards", "Starters: week-8 yards"],
  ["relieverFromYards", "Bullpen arms and closers: first-week yards"], ["relieverToYards", "Bullpen arms and closers: week-8 yards"],
  ["buildWeeks", "Weeks to build up"], ["lowReadinessShare", "Low-readiness share (0–1)"],
];
const STOP: [string, string][] = [
  ["maxSprintDropPct", "Max sprints: stop when slower than best by (%)"], ["repeatDropPct", "Repeat conditioning: stop when slower than best by (%)"],
  ["slowerInARow", "Stop after this many \"Slower\" in a row"], ["highEffort", "High effort is"], ["highEffortInARow", "Stop after this many high-effort reps in a row"],
  ["offerEffortMax", "Offer more reps when effort is at most"], ["offerNearBestPct", "Offer more when within best by (%)"], ["offerReps", "Extra reps offered"],
];
const db = supabase as any;

/** Owner-editable sprint targets and smart-stop limits. The 1000-yard session cap is fixed. */
export function ConditioningSettings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: ["conditioning-rules"], queryFn: async () => {
    const r = await db.from("app_settings").select("setting_value").eq("setting_key", CONDITIONING_RULES_KEY).maybeSingle();
    if (r.error) throw r.error;
    return conditioningRules(r.data?.setting_value);
  } });
  useEffect(() => { if (!q.data) return; const o: Record<string, string> = {}; for (const [k] of TARGETS) o[`t.${k}`] = String((q.data.targets as any)[k]); for (const [k] of STOP) o[`s.${k}`] = String((q.data.stop as any)[k]); setVals(o); }, [q.data]);
  async function save() {
    const targets: Record<string, number> = {}, stop: Record<string, number> = {};
    for (const [key, v] of Object.entries(vals)) { const n = Number(v); if (!v.trim() || !Number.isFinite(n) || n <= 0) { setMsg("Every value needs a number above 0."); return; } (key.startsWith("t.") ? targets : stop)[key.slice(2)] = n; }
    if (targets.starterToYards > 1000 || targets.relieverToYards > 1000) { setMsg("No session can go past 1000 yards."); return; }
    const value = { targets, stop };
    const existing = await db.from("app_settings").select("id").eq("setting_key", CONDITIONING_RULES_KEY).maybeSingle();
    const r = existing.data ? await db.from("app_settings").update({ setting_value: value }).eq("setting_key", CONDITIONING_RULES_KEY) : await db.from("app_settings").insert({ setting_key: CONDITIONING_RULES_KEY, setting_value: value });
    if (r.error) { setMsg("Couldn't save. Your changes are still here."); return; }
    const back = await q.refetch(); setMsg(back.data ? "Conditioning settings saved and read back." : "Saved, but couldn't read back.");
  }
  const field = (prefix: string) => ([k, label]: [string, string]) => <div key={k} className="space-y-1"><Label htmlFor={`cond-${prefix}${k}`}>{label}</Label><Input id={`cond-${prefix}${k}`} type="number" step="0.01" value={vals[`${prefix}${k}`] ?? ""} onChange={e => setVals(p => ({ ...p, [`${prefix}${k}`]: e.target.value }))} /></div>;
  return <section aria-label="Conditioning targets and smart stop" className="space-y-3 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Conditioning targets and smart stop</h2>
    <p className="text-sm text-muted-foreground">Starting values you can edit. Every session stays at or under 1000 yards, and sprint rest stays 1 minute per 10 yards (up to 5 minutes).</p>
    {q.isError ? <p role="alert" className="text-sm text-destructive">Couldn't read saved settings.</p> : <>
      <h3 className="font-medium">Pitcher sprint yards</h3><div className="grid gap-2 sm:grid-cols-2">{TARGETS.map(field("t."))}</div>
      <h3 className="font-medium">Smart stop</h3><div className="grid gap-2 sm:grid-cols-2">{STOP.map(field("s."))}</div>
    </>}
    <Button onClick={save} disabled={q.isPending || q.isError}>Save conditioning settings</Button>{msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
