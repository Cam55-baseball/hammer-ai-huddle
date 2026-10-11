/**
 * Inside the exercise disclosure: the automatic status label, the optional
 * explicit Skip, and How hard 1–10 (autosaved). Done / Cut short / Did more are
 * never buttons — they come from the entries in "Log this work".
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLatestExerciseLog } from "@/hooks/useExerciseLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { AUTO_STATUS_LABEL, type AutoStatus } from "@/lib/logging/autoCompletion";

export type CardOutcome = "completed" | "skipped" | "cut_short";
export const CARD_OUTCOME_LABEL: Record<CardOutcome, string> = { completed: "Done", skipped: "Skipped", cut_short: "Cut short" };

export function statusFromLog(rxStatus: string | null | undefined, metrics: any): AutoStatus {
  if (rxStatus === "skipped" || metrics?.one_tap_outcome === "skipped") return "skipped";
  if (metrics?.one_tap_outcome === "cut_short") return "cut_short";
  if (metrics?.did_more) return "did_more";
  if (metrics?.one_tap_outcome === "completed" || rxStatus === "completed") return "done";
  if (rxStatus === "missed") return "missed";
  return null;
}

export function CardOutcomeLog({ rx, disabled }: { rx: WkRx; disabled?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const status = statusFromLog(rx.status, latest?.metrics);
  const [hard, setHard] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = useRef<number | null>(null);
  useEffect(() => { if (latest?.rpe != null) setHard(String(latest.rpe)); }, [latest]);

  const refresh = () => {
    if (!user?.id) return;
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
    qc.invalidateQueries({ queryKey: ["exercise-log", user.id, rx.id] });
  };

  const saveHard = async (value: string) => {
    if (!user?.id || disabled) return;
    const n = Number(value);
    const rpe = value !== "" && Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null;
    const { error } = latest?.id
      ? await (supabase as any).from("wk_session_logs").update({ rpe }).eq("id", latest.id)
      : await (supabase as any).from("wk_session_logs").insert({ user_id: user.id, prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug, rpe, metrics: {} });
    if (!error) { setSaved(true); qc.invalidateQueries({ queryKey: ["exercise-log", user.id, rx.id] }); }
  };
  const onHard = (v: string) => {
    const clean = v.replace(/[^\d]/g, "").slice(0, 2);
    setHard(clean); setSaved(false);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => void saveHard(clean), 500);
  };

  const toggleSkip = async () => {
    if (!user?.id || saving || disabled) return;
    setSaving(true);
    const skip = status !== "skipped";
    const { error } = latest?.id
      ? await (supabase as any).from("wk_session_logs").update({ metrics: { ...latest.metrics, one_tap_outcome: skip ? "skipped" : null } }).eq("id", latest.id)
      : await (supabase as any).from("wk_session_logs").insert({ user_id: user.id, prescription_id: rx.id, plan_date: rx.plan_date, movement_slug: rx.movement_slug, sets_completed: 0, metrics: { one_tap_outcome: "skipped" } });
    const { error: e2 } = error ? { error } : await supabase.from("wk_prescriptions" as any).update({ status: skip ? "skipped" : "planned" }).eq("id", rx.id);
    setSaving(false);
    if (error || e2) { toast.error("Couldn't save — try again."); return; }
    refresh();
  };

  return (
    <div className="space-y-2" data-card-outcome-log>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium">Status:</span>
        <span data-auto-status={status ?? "none"} className="text-[11px] font-semibold">{status ? AUTO_STATUS_LABEL[status] : "Not logged yet — enter your work above"}</span>
        <Button type="button" size="sm" variant={status === "skipped" ? "default" : "outline"} className="ml-auto h-9 text-xs" disabled={saving || disabled} onClick={toggleSkip}>
          {status === "skipped" ? "Undo skip" : "Skip"}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-[11px] shrink-0" htmlFor={`hard-${rx.id}`}>How hard 1–10</Label>
        <Input id={`hard-${rx.id}`} inputMode="numeric" value={hard} className="h-9 w-20 text-sm"
          onChange={(e) => onHard(e.target.value)} onBlur={() => { if (t.current) { window.clearTimeout(t.current); void saveHard(hard); } }} />
        {saved && <span data-autosave-state="saved" className="text-[11px] text-muted-foreground">✓ Saved</span>}
      </div>
    </div>
  );
}
