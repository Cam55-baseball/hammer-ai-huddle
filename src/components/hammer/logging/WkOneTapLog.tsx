/**
 * TCS stage S4 — one-tap logging for a single movement.
 * Gated by the `one_tap_logging` switch: off means this renders nothing and the
 * existing complete/skip control is the only logging path, exactly as before.
 *
 * Rules honoured here:
 *  - Done / Skipped / Cut short, one tap each.
 *  - "How hard? 1–10" and per-set load/reps are optional.
 *  - Load and reps are pre-filled with today's target.
 *  - Targets are shown as plain numbers. Percentages are never displayed.
 *  - A missing log still counts as done; only an explicit Skipped marks a skip.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useFeatureSwitches } from "@/hooks/useFeatureSwitches";
import { toast } from "sonner";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useQuery } from "@tanstack/react-query";
import {
  targetWeight,
  type LoggedSet,
} from "../../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/silentSignals";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";

export type OneTapOutcome = "completed" | "skipped" | "cut_short";

const OUTCOME_LABEL: Record<OneTapOutcome, string> = {
  completed: "Done",
  skipped: "Skipped",
  cut_short: "Cut short",
};

export function WkOneTapLog({ rx }: { rx: WkRx }) {
  const { isEnabled } = useFeatureSwitches();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { trainingAgeContext } = useHammersToday() as unknown as {
    trainingAgeContext?: { class?: string | null; training_age_class?: string | null } | null;
  };
  // Silent Signals §3 — the pre-filled target. Foundation and youth athletes
  // resolve to a last-session number; nobody is ever shown a percentage.
  const ageClass = String(
    trainingAgeContext?.class ?? trainingAgeContext?.training_age_class ?? "",
  ).toLowerCase();
  const youthOrFoundation = ageClass.includes("foundation") || ageClass.includes("youth") || ageClass.includes("beginner");
  const history = useQuery({
    queryKey: ["one-tap-history", user?.id, rx.movement_slug],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("wk_session_logs" as any)
        .select("plan_date, load_used, reps_completed, rpe")
        .eq("user_id", user!.id)
        .eq("movement_slug", rx.movement_slug)
        .order("plan_date", { ascending: false })
        .limit(6);
      return (data ?? []) as Array<Record<string, any>>;
    },
  });
  const loggedSets: LoggedSet[] = (history.data ?? []).flatMap((row) => {
    const load = Number(row.load_used);
    const repsArr: number[] = Array.isArray(row.reps_completed) ? row.reps_completed : [];
    if (!Number.isFinite(load) || load <= 0) return [];
    return repsArr
      .filter((r) => Number.isFinite(r) && r > 0)
      .map((r) => ({ date: String(row.plan_date), pattern: rx.movement_slug, load, reps: Number(r) }));
  });
  const lastLoad = loggedSets[0]?.load ?? null;
  const target = targetWeight({
    sets: loggedSets,
    intensity: rx.load_pct != null ? Number(rx.load_pct) / 100 : null,
    youthOrFoundation,
    lastSession: lastLoad != null ? { load: lastLoad, reps: loggedSets[0]!.reps } : null,
  });
  const [outcome, setOutcome] = useState<OneTapOutcome | null>(null);
  const [hard, setHard] = useState<string>("");
  const [load, setLoad] = useState<string>("");
  const [reps, setReps] = useState<string>(rx.reps != null ? String(rx.reps) : "");
  const [saving, setSaving] = useState(false);

  if (!isEnabled("one_tap_logging")) return null;

  const save = async (next: OneTapOutcome) => {
    if (!user?.id || saving) return;
    setOutcome(next);
    setSaving(true);
    const rpeRaw = Number(hard);
    const { error } = await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id,
      prescription_id: rx.id,
      plan_date: rx.plan_date,
      movement_slug: rx.movement_slug,
      sets_completed: next === "skipped" ? 0 : rx.sets ?? null,
      reps_completed:
        next !== "skipped" && rx.sets && Number(reps)
          ? Array.from({ length: rx.sets }, () => Number(reps))
          : null,
      load_used: next !== "skipped" && Number(load) ? Number(load) : null,
      rpe: Number.isFinite(rpeRaw) && rpeRaw >= 1 && rpeRaw <= 10 ? Math.round(rpeRaw) : null,
      notes: null,
      metrics: { one_tap_outcome: next },
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save that — try again.");
      return;
    }
    await supabase
      .from("wk_prescriptions" as any)
      .update({ status: next === "skipped" ? "skipped" : "completed" })
      .eq("id", rx.id);
    toast.success(next === "skipped" ? "Marked skipped." : "Logged — nice work.");
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
  };

  return (
    <div className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2 space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(OUTCOME_LABEL) as OneTapOutcome[]).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={outcome === k ? "default" : "outline"}
            className="h-8 text-xs"
            disabled={saving}
            onClick={() => save(k)}
          >
            {OUTCOME_LABEL[k]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="space-y-1">
          <Label className="text-[10px]" htmlFor={`hard-${rx.id}`}>How hard? 1–10</Label>
          <Input
            id={`hard-${rx.id}`}
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            value={hard}
            onChange={(e) => setHard(e.target.value)}
            className="h-8 text-xs"
            placeholder="optional"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]" htmlFor={`load-${rx.id}`}>Weight</Label>
          <Input
            id={`load-${rx.id}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={load !== "" ? load : target.target != null ? String(target.target) : ""}
            onChange={(e) => setLoad(e.target.value)}
            className="h-8 text-xs"
            placeholder="optional"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]" htmlFor={`reps-${rx.id}`}>Reps</Label>
          <Input
            id={`reps-${rx.id}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-8 text-xs"
            placeholder="optional"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Only the buttons are needed. If you log nothing, it still counts as done.
      </p>
    </div>
  );
}
