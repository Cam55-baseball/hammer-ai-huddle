import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROPOSED_RECOVERY_THRESHOLDS, RECOVERY_SETTING_KEY, recoveryThresholdsFrom, type RecoveryThresholds,
} from "../../../supabase/functions/_shared/readiness/recoveryAdjust";

// deno-lint-ignore no-explicit-any
const db = supabase as any;

const FIELDS: { key: keyof RecoveryThresholds; label: string }[] = [
  { key: "capDown", label: "Largest drop in a day (0–1 readiness scale)" },
  { key: "capUp", label: "Largest lift in a day" },
  { key: "healthMinDays", label: "Days of Apple Health data before HRV/resting HR count" },
  { key: "hrvRecentDays", label: "Recent window (days)" },
  { key: "hrvMinRecentDays", label: "Days needed inside the recent window" },
  { key: "healthBaselineDays", label: "Personal baseline window (days)" },
  { key: "hrvLowSd", label: "HRV low = recent ln(HRV) below baseline minus this many SD" },
  { key: "hrvLowDrop", label: "Drop for low HRV" },
  { key: "hrvHighLift", label: "Lift when HRV is at or above baseline" },
  { key: "rhrAboveBpm", label: "Resting HR this many bpm above baseline lowers readiness" },
  { key: "rhrDrop", label: "Drop for high resting HR" },
];

async function upsertSetting(key: string, value: unknown): Promise<string | null> {
  const cur = await db.from("app_settings").select("setting_key").eq("setting_key", key).maybeSingle();
  if (cur.error) return cur.error.message;
  const r = cur.data
    ? await db.from("app_settings").update({ setting_value: value }).eq("setting_key", key)
    : await db.from("app_settings").insert({ setting_key: key, setting_value: value });
  return r.error ? r.error.message : null;
}

/** Release A2: owner-editable PROPOSED thresholds for the Apple Health effect (stress and mental load removed Nov 9). */
export function ReadinessInputsSettings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const q = useQuery({
    queryKey: ["readiness-inputs-settings"],
    queryFn: async () => {
      const r = await db.from("app_settings").select("setting_key, setting_value").eq("setting_key", RECOVERY_SETTING_KEY).maybeSingle();
      if (r.error) throw r.error;
      return { thresholds: recoveryThresholdsFrom(r.data?.setting_value) };
    },
  });
  useEffect(() => {
    if (!q.data) return;
    setVals(Object.fromEntries(FIELDS.map((f) => [f.key, String(q.data.thresholds[f.key])])));
  }, [q.data]);

  async function save() {
    const thresholds: Record<string, number> = {};
    for (const f of FIELDS) {
      const n = Number(vals[f.key]);
      if (!Number.isFinite(n) || n < 0) { setMsg(`"${f.label}" needs a number of 0 or more.`); return; }
      thresholds[f.key] = n;
    }
    if (await upsertSetting(RECOVERY_SETTING_KEY, thresholds)) { setMsg("Couldn't save. Your changes are still here."); return; }
    const back = await q.refetch();
    setMsg(back.data ? "Saved and read back." : "Saved, but couldn't read back.");
  }

  return <section aria-label="Readiness inputs" className="space-y-3 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Readiness inputs: Apple Health (proposed)</h2>
    <p className="text-sm text-muted-foreground">
      These numbers are <strong>proposed</strong>, not from a published source. They move only the recovery side of that day's
      readiness — never throw counts, sprint caps or lift caps — and only the single largest effect counts. Players without
      Apple Health data get no effect and no penalty. They work only while the readiness_health_v1 switch is on.
    </p>
    {q.isError ? <p role="alert" className="text-sm text-destructive">Couldn't read the saved settings.</p> :
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => <div key={f.key} className="space-y-1">
          <Label htmlFor={`ri-${f.key}`}>{f.label} <span className="text-muted-foreground">(proposed {PROPOSED_RECOVERY_THRESHOLDS[f.key]})</span></Label>
          <Input id={`ri-${f.key}`} type="number" step="any" min={0} value={vals[f.key] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
        </div>)}
      </div>}
    <Button onClick={() => void save()} disabled={q.isPending || q.isError}>Save readiness inputs</Button>
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
