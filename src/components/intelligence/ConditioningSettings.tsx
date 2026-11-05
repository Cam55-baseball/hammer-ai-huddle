import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditioningRules, CONDITIONING_RULES_KEY } from "../../../supabase/functions/_shared/wic/conditioning/yards";
import { positionSprintStandards } from "../../../supabase/functions/_shared/wic/conditioning/positionSprints";
import { inSeasonStandards } from "../../../supabase/functions/_shared/wic/conditioning/inSeasonSprints";

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
const POSITION: [string, string][] = [
  ["maxBasesPerDay", "Most base-length sprints in a day (outside warm-up)"], ["stepPerGreenWeek", "Base sprints added per green week (1–2)"],
  ["dayBeforeGameShare", "Day before a game: share of capacity (0–1)"], ["afterHighDayShare", "Day after a high-sprint day: share (0–1)"],
  ["lowReadinessShare", "Lower-readiness day: share (0–1)"], ["highDayShare", "A day counts as high-sprint at this share (0–1)"],
];
/** Owner Nov 5 r4: in-season (dense schedule) numbers, all editable. */
const IN_SEASON: [string, string][] = [
  ["speedSprints", "Speed day: all-out base sprints (full rest)"], ["topupShare", "Off-day top-up: share of the daily count (0–1)"],
  ["topupMin", "Off-day top-up: fewest bases"], ["topupMax", "Off-day top-up: most bases"],
  ["runningDayBases", "A day counts as a running day at this many bases"], ["weeklyTargetDays", "Weekly target: full days of the daily count"],
  ["heavyGameShare", "A game is heavy at this share of the daily count (0–1)"],
  ["lowPlayMaxBases", "Not getting playing time: a game at or under this many bases"],
  ["extraSprintsMax", "Extra speed session: all-out base sprints (3–4)"], ["extraSprintsMin", "Extra speed session on a tired day (3–4)"],
  ["basesPerPaDefault", "At-bats estimate: bases per plate appearance (default)"], ["ownAverageMinPa", "Use the player's own average after this many logged plate appearances"],
];
const db = supabase as any;

/** Owner-editable sprint targets and smart-stop limits. The 1000-yard session cap is fixed. */
export function ConditioningSettings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: ["conditioning-rules"], queryFn: async () => {
    const r = await db.from("app_settings").select("setting_value").eq("setting_key", CONDITIONING_RULES_KEY).maybeSingle();
    if (r.error) throw r.error;
    return { ...conditioningRules(r.data?.setting_value), position: positionSprintStandards((r.data?.setting_value as any)?.position), inSeason: inSeasonStandards((r.data?.setting_value as any)?.inSeason) };
  } });
  useEffect(() => { if (!q.data) return; const o: Record<string, string> = {}; for (const [k] of TARGETS) o[`t.${k}`] = String((q.data.targets as any)[k]); for (const [k] of STOP) o[`s.${k}`] = String((q.data.stop as any)[k]); for (const [k] of POSITION) o[`p.${k}`] = String((q.data.position as any)[k]); for (const [k] of IN_SEASON) o[`i.${k}`] = String((q.data.inSeason as any)[k]); setVals(o); }, [q.data]);
  async function save() {
    const targets: Record<string, number> = {}, stop: Record<string, number> = {}, position: Record<string, number> = {}, inSeason: Record<string, number> = {};
    for (const [key, v] of Object.entries(vals)) { const n = Number(v); if (!v.trim() || !Number.isFinite(n) || n < 0 || (n === 0 && !key.startsWith("p.") && !key.startsWith("i."))) { setMsg("Every value needs a number above 0."); return; } (key.startsWith("t.") ? targets : key.startsWith("p.") ? position : key.startsWith("i.") ? inSeason : stop)[key.slice(2)] = n; }
    if (inSeason.speedSprints < 1 || inSeason.speedSprints > 6) { setMsg("Speed day sprints must be 1 to 6."); return; }
    if (inSeason.topupMax < inSeason.topupMin) { setMsg("Top-up most bases must be at least the fewest bases."); return; }
    if (["topupShare", "heavyGameShare"].some((k) => inSeason[k] > 1)) { setMsg("Shares must be between 0 and 1."); return; }
    if (position.stepPerGreenWeek < 1 || position.stepPerGreenWeek > 2) { setMsg("Base sprints added per green week must be 1 or 2."); return; }
    if (["dayBeforeGameShare", "afterHighDayShare", "lowReadinessShare", "highDayShare"].some((k) => position[k] > 1)) { setMsg("Shares must be between 0 and 1."); return; }
    if (targets.starterToYards > 1000 || targets.relieverToYards > 1000) { setMsg("No session can go past 1000 yards."); return; }
    const value = { targets, stop, position, inSeason };
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
      <h3 className="font-medium">Position players: game-day base running</h3>
      <p className="text-sm text-muted-foreground">Counted in bases (90 ft baseball, 60 ft softball), never yards. Rest stays 30 seconds between reps until 4 bases, then 5 minutes.</p>
      <div className="grid gap-2 sm:grid-cols-2">{POSITION.map(field("p."))}</div>
      <h3 className="font-medium">Position players: in-season (games most days)</h3>
      <p className="text-sm text-muted-foreground">Games count first. The speed day always follows the sprint warm-up (A-skips and dribbles, then build-ups at about 60%, 75% and 90%).</p>
      <div className="grid gap-2 sm:grid-cols-2">{IN_SEASON.map(field("i."))}</div>
      <h3 className="font-medium">Smart stop</h3><div className="grid gap-2 sm:grid-cols-2">{STOP.map(field("s."))}</div>
    </>}
    <Button onClick={save} disabled={q.isPending || q.isError}>Save conditioning settings</Button>{msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
