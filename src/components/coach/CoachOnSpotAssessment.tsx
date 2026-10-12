import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CHECKS = [
  { key: "hip", label: "Hip rotation" },
  { key: "shoulder", label: "Shoulder rotation" },
  { key: "ankle", label: "Ankle mobility" },
  { key: "balance", label: "Single-leg balance" },
] as const;
type Result = "ok" | "limited";

/** Plan 4 B — on-the-spot movement and safety check, run in person by a connected coach.
 *  Saves to the PLAYER's profile through the server, labeled coach-verified with name and date. */
export function CoachOnSpotAssessment({ athleteId }: { athleteId: string }) {
  const [vals, setVals] = useState<Record<string, Result | undefined>>({});
  const [pain, setPain] = useState<boolean | null>(null);
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ready = CHECKS.every((c) => vals[c.key]) && pain !== null;

  async function save() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("coach_record_movement_screen", {
      _athlete: athleteId, _screen: vals as Record<string, string>, _pain: !!pain, _parent_present: parent,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg(`Saved to the player's profile — ${(data as { label?: string })?.label ?? "Coach-verified"}${pain ? ". Pain reported: their plan adjusts under the safety rules." : ""}`);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">On-the-spot movement & safety check</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Do this with the player in person. It saves to their profile as coach-verified.</p>
        {CHECKS.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2">
            <span>{c.label}</span>
            <div className="flex gap-1">
              {(["ok", "limited"] as Result[]).map((r) => (
                <Button key={r} size="sm" variant={vals[c.key] === r ? "default" : "outline"}
                  onClick={() => setVals({ ...vals, [c.key]: r })}>{r === "ok" ? "Moves well" : "Limited"}</Button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2">
          <span>Pain check: any pain right now?</span>
          <div className="flex gap-1">
            <Button size="sm" variant={pain === false ? "default" : "outline"} onClick={() => setPain(false)}>No pain</Button>
            <Button size="sm" variant={pain === true ? "default" : "outline"} onClick={() => setPain(true)}>Pain</Button>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="parent-present" checked={parent} onCheckedChange={(v) => setParent(v === true)} />
          <Label htmlFor="parent-present" className="text-xs leading-snug">
            Player under 13: their parent is here with us and agrees to this check. (Required for under-13.)
          </Label>
        </div>
        <Button className="w-full" disabled={!ready || busy} onClick={save}>{busy ? "Saving…" : "Save to player's profile"}</Button>
        {msg && <p className="text-xs" role="status">{msg}</p>}
      </CardContent>
    </Card>
  );
}
