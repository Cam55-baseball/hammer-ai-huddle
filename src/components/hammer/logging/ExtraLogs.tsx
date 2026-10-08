/**
 * Round 8 Step 2d — player logging that never changes today's plan.
 *  - TestedMaxLog: a real 1-rep max the player performed (feeds verifiedMax).
 *  - PracticeLog: team practice / lesson / game-prep session (record only).
 *  - saveSprintRun: persists stopwatch reps (record only).
 * All rows go to wk_session_logs with an explicit metrics.kind.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";

const today = () => new Date().toLocaleDateString("en-CA");

export async function saveSprintRun(userId: string, movementSlug: string, planDate: string, prescriptionId: string | null,
  run: { seconds: number; by: "self" | "partner"; steps: number | null }, distanceFeet: number | null) {
  const { error } = await supabase.from("wk_session_logs" as any).insert({
    user_id: userId, prescription_id: prescriptionId, plan_date: planDate, movement_slug: movementSlug,
    distance_feet_completed: distanceFeet, load_used: null,
    metrics: { kind: "sprint_time", sprint_time_s: run.seconds, timed_by: run.by, steps: run.steps },
  });
  return !error;
}

export function TestedMaxLog({ movementSlug, movementName }: { movementSlug: string; movementName: string }) {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [w, setW] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const save = async () => {
    const weight = Number(w);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1500) { toast.error("Enter the weight you lifted for 1 rep."); return; }
    setBusy(true);
    const { error } = await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, plan_date: today(), movement_slug: movementSlug, prescription_id: null,
      load_used: weight, reps_completed: [1], sets_completed: 1,
      metrics: { kind: "tested_max", tested_max: true, weight_source: "player" },
    });
    setBusy(false);
    if (error) { toast.error("Couldn't save — try again."); return; }
    toast.success(`Tested max saved: ${weight} lb`);
    setOpen(false); setW("");
    qc.invalidateQueries({ queryKey: ["verified-max", user.id, movementSlug] });
  };
  if (!open) {
    return <Button variant="link" size="sm" className="h-6 px-0 text-[11px]" onClick={() => setOpen(true)}>Log a tested max for {movementName}</Button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-xs">
      <span className="text-muted-foreground">Tested max (1 rep, lb):</span>
      <Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value.replace(/[^\d.]/g, ""))} className="h-7 w-20 text-xs" aria-label="Tested max weight in pounds" />
      <Button size="sm" className="h-7" disabled={busy} onClick={save}>Save</Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>Cancel</Button>
      <p className="w-full text-[10px] text-muted-foreground">Only log a max you actually lifted, with a spotter. Never test a max just for the app.</p>
    </div>
  );
}

const KINDS = [["team_practice", "Team practice"], ["lesson", "Lesson"], ["own_work", "Own work"]] as const;

export function PracticeLog({ planDate, modality }: { planDate?: string; modality?: string } = {}) {
  const { user } = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("team_practice");
  const [mins, setMins] = useState("");
  const [hard, setHard] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const save = async () => {
    const m = Number(mins), h = Number(hard);
    if (!Number.isFinite(m) || m < 5 || m > 600) { toast.error("Enter how many minutes (5–600)."); return; }
    setBusy(true);
    const { error } = await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, plan_date: planDate ?? today(), movement_slug: `practice_${kind}`, prescription_id: null,
      duration_seconds_completed: Math.round(m * 60), load_used: null,
      rpe: Number.isFinite(h) && h >= 1 && h <= 10 ? Math.round(h) : null,
      metrics: { kind: "practice", practice_kind: kind, modality: modality ?? null },
    });
    setBusy(false);
    if (error) { toast.error("Couldn't save — try again."); return; }
    toast.success("Practice logged.");
    setOpen(false); setMins(""); setHard("");
  };
  if (!open) return <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>Log a practice</Button>;
  return (
    <div data-practice-log className="space-y-2 rounded-md border border-border p-2 text-xs">
      <div className="flex flex-wrap gap-1">
        {KINDS.map(([k, l]) => (
          <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setKind(k)}>{l}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1"><span className="text-muted-foreground">Minutes:</span>
          <Input inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))} className="h-7 w-16 text-xs" /></label>
        <label className="flex items-center gap-1"><span className="text-muted-foreground">How hard? 1–10:</span>
          <Input inputMode="numeric" value={hard} onChange={(e) => setHard(e.target.value.replace(/\D/g, ""))} className="h-7 w-12 text-xs" /></label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7" disabled={busy} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Saved to your history. It doesn't change today's plan.</p>
    </div>
  );
}
