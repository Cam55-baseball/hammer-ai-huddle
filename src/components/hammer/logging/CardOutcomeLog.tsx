/** Per-exercise outcomes and effort, inside the exercise disclosure. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLatestExerciseLog } from "@/hooks/useExerciseLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

export type CardOutcome = "completed" | "skipped" | "cut_short";
export const CARD_OUTCOME_LABEL: Record<CardOutcome, string> = { completed: "Done", skipped: "Skipped", cut_short: "Cut short" };

export function CardOutcomeLog({ rx, disabled }: { rx: WkRx; disabled?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const [outcome, setOutcome] = useState<CardOutcome | null>(
    rx.status === "completed" ? "completed" : rx.status === "skipped" ? "skipped" : null,
  );
  const [hard, setHard] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const stored = latest?.metrics?.one_tap_outcome;
    if (stored === "completed" || stored === "skipped" || stored === "cut_short") setOutcome(stored);
    else setOutcome(rx.status === "completed" ? "completed" : rx.status === "skipped" ? "skipped" : null);
    if (latest?.rpe != null) setHard(String(latest.rpe));
  }, [latest, rx.status]);

  const save = async (next: CardOutcome) => {
    if (!user?.id || saving || disabled) return;
    setSaving(true);
    const rpe = Number(hard);
    const { error } = await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug,
      sets_completed: latest?.sets_completed ?? (next === "skipped" ? 0 : rx.sets ?? null),
      reps_completed: latest?.reps_completed ?? (next === "completed" && rx.sets && rx.reps ? Array.from({ length: rx.sets }, () => rx.reps as number) : null),
      load_used: latest?.load_used ?? null,
      duration_seconds_completed: latest?.duration_seconds_completed ?? (next === "completed" ? rx.duration_seconds ?? null : null),
      distance_feet_completed: latest?.distance_feet_completed ?? (next === "completed" ? rx.distance_feet ?? null : null),
      total_reps_completed: latest?.total_reps_completed ?? (next === "completed" ? rx.total_reps ?? null : null),
      rpe: Number.isFinite(rpe) && rpe >= 1 && rpe <= 10 ? Math.round(rpe) : null,
      notes: latest?.notes ?? null,
      bar_feel: latest?.bar_feel ?? null,
      ai_readback: latest?.ai_readback ?? null,
      metrics: { ...latest?.metrics, one_tap_outcome: next, cut_short: next === "cut_short" },
    });
    if (!error) {
      const { error: e2 } = await supabase.from("wk_prescriptions" as any)
        .update({ status: next === "skipped" ? "skipped" : "completed" }).eq("id", rx.id);
      if (e2) { setSaving(false); toast.error("Couldn't save — try again."); return; }
    }
    setSaving(false);
    if (error) { toast.error("Couldn't save — try again."); return; }
    setOutcome(next);
    toast.success(next === "skipped" ? "Marked skipped." : next === "cut_short" ? "Logged as cut short." : "Logged — nice work.");
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
    qc.invalidateQueries({ queryKey: ["exercise-log", user.id, rx.id] });
  };

  return (
    <div className="space-y-2" data-card-outcome-log>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(CARD_OUTCOME_LABEL) as CardOutcome[]).map((k) => (
          <Button key={k} type="button" size="sm" variant={outcome === k ? "default" : "outline"} className="h-9 text-xs"
            disabled={saving || disabled} onClick={() => save(k)}>{CARD_OUTCOME_LABEL[k]}</Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-[11px] shrink-0" htmlFor={`hard-${rx.id}`}>How hard 1–10</Label>
        <Input id={`hard-${rx.id}`} inputMode="numeric" value={hard} className="h-9 w-20 text-sm"
          onChange={(e) => setHard(e.target.value.replace(/[^\d]/g, "").slice(0, 2))} />
      </div>
    </div>
  );
}
