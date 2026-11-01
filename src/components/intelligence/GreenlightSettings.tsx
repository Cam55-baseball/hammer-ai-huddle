import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readyThresholdFrom, READY_SETTING_KEY } from "../../../supabase/functions/_shared/wic/progression/greenlight";

const db = supabase as any;

/** Owner Nov 1 round 5: the ONE "ready" check-in threshold for the step-up rule. Empty = everyone holds. */
export function GreenlightSettings() {
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: ["greenlight-ready-threshold"], queryFn: async () => {
    const r = await db.from("app_settings").select("setting_value").eq("setting_key", READY_SETTING_KEY).maybeSingle();
    if (r.error) throw r.error;
    return { exists: !!r.data, readyAt: readyThresholdFrom(r.data?.setting_value) };
  } });
  useEffect(() => { if (q.data) setVal(q.data.readyAt == null ? "" : String(Math.round(q.data.readyAt * 100))); }, [q.data]);
  async function write(readyAt: number | null) {
    const value = { readyAt };
    const r = q.data?.exists
      ? await db.from("app_settings").update({ setting_value: value }).eq("setting_key", READY_SETTING_KEY)
      : await db.from("app_settings").insert({ setting_key: READY_SETTING_KEY, setting_value: value });
    if (r.error) { setMsg("Couldn't save. Your change is still here."); return; }
    const back = await q.refetch();
    setMsg(!back.data ? "Saved, but couldn't read back." : back.data.readyAt == null ? "Cleared. Everyone holds until you set a value." : `Saved and read back: ready means ${Math.round(back.data.readyAt * 100)}% or higher.`);
  }
  function save() {
    const n = Number(val);
    if (!val.trim() || !Number.isFinite(n) || n <= 0 || n > 100) { setMsg("Enter a percent from 1 to 100."); return; }
    void write(n / 100);
  }
  return <section aria-label="Step-up ready check-in" className="space-y-3 border-b border-border py-4">
    <h2 className="text-lg font-semibold">Step-up rule: "ready" check-in</h2>
    <p className="text-sm text-muted-foreground">A day counts as ready when the player's check-in readiness is at or above this share of the scale (for example 60 means 3.4 of 5, or 6 of 10). Until you set it, no player steps up or back. Bunts are never gated.</p>
    {q.isError ? <p role="alert" className="text-sm text-destructive">Couldn't read the saved setting.</p> : <div className="space-y-1 sm:max-w-xs">
      <Label htmlFor="greenlight-ready">Ready at (%)</Label>
      <Input id="greenlight-ready" type="number" min={1} max={100} value={val} placeholder="Not set" onChange={e => setVal(e.target.value)} />
    </div>}
    <div className="flex gap-2">
      <Button onClick={save} disabled={q.isPending || q.isError}>Save ready setting</Button>
      <Button variant="outline" onClick={() => void write(null)} disabled={q.isPending || q.isError || q.data?.readyAt == null}>Clear</Button>
    </div>
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </section>;
}
