/**
 * WkCardCompletion — card-level Done/Skip for the four Wk workout cards
 * (Lifts, Speed, Bat-Speed, Conditioning).
 *
 * Bulk-updates every wk_prescription row for the slot AND writes matching
 * task rows in `hammer_daily_task_completions` so the per-row checkboxes
 * stay in lockstep with this card-level control.
 */
import { useMemo, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearCompletion,
  loadEngagement,
  recordCompletion,
  todayCompletion,
  type EngagementKey,
} from "@/lib/hammer/prescription/dailyEngagement";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useHammerDailyTasks, type TaskSeed } from "@/hooks/useHammerDailyTasks";
import { emitVideoMoment } from "@/lib/videoMoments/bus";
import type { SkillDomain } from "@/lib/videoRecommendationEngine";

const MODALITY_DOMAIN: Partial<Record<EngagementKey, SkillDomain>> = {
  hitting: "hitting",
  bat_speed: "hitting",
  throwing: "throwing",
  defense: "fielding",
  baserunning: "base_running",
  speed: "base_running",
  conditioning: "base_running",
};

interface Props {
  readonly modality: EngagementKey;
  readonly modalityLabel: string;
  readonly items: ReadonlyArray<WkRx>;
  /** Optional laterality tag for switch hitters / ambi throwers (L or R). */
  readonly side?: "L" | "R" | null;
}

export function WkCardCompletion({ modality, modalityLabel, items, side = null }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const planDate = items[0]?.plan_date ?? new Date().toISOString().slice(0, 10);
  const tasks = useHammerDailyTasks(planDate);
  const [current, setCurrent] = useState(() =>
    todayCompletion(loadEngagement(user?.id), modality, side),
  );
  const [busy, setBusy] = useState(false);

  const encouragement = useMemo(() => {
    const bank = [
      "That's a rep in the bank.",
      "Locked in — Hammer sees it.",
      "Foundation stone laid.",
      "Consistency compounds.",
      "One more brick in the wall.",
    ];
    return bank[Math.floor(Math.random() * bank.length)];
  }, []);

  /** Take back today's done/skipped mark — the plan returns to untouched. */
  async function undo() {
    if (busy) return;
    setBusy(true);
    try {
      clearCompletion(user?.id, modality, side);
      setCurrent(null);
      if (user?.id && items.length > 0) {
        if (!side) {
          const ids = items.map((r) => r.id);
          const { error } = await supabase
            .from("wk_prescriptions" as any)
            .update({ status: "pending" })
            .in("id", ids);
          if (error) console.warn("wk_prescriptions status undo failed", error);
          // Remove the session-log rows this card wrote, so an accidental
          // "done" doesn't teach tomorrow's plan the wrong thing.
          const { error: logErr } = await supabase
            .from("wk_session_logs" as any)
            .delete()
            .in("prescription_id", ids);
          if (logErr) console.warn("wk_session_logs undo failed", logErr);
        }
        const seeds: TaskSeed[] = items.map((r) => ({
          taskId: r.id,
          source: "wk_prescription",
          sourceRef: r.slot,
          side,
          payload: { name: r.movement_name, slug: r.movement_slug, side },
        }));
        void tasks.bulkSet(seeds, false);
        qc.invalidateQueries({ queryKey: ["wk-rx", user.id] });
      }
      toast(`${modalityLabel} is open again.`);
    } finally {
      setBusy(false);
    }
  }

  async function mark(status: "done" | "skipped") {
    if (busy) return;
    if (items.length === 0) {
      toast("Nothing is prescribed here yet, so there's nothing to mark done.");
      return;
    }
    setBusy(true);
    try {
      // 1) local engagement — drives Daily Intent header + healing narrative
      recordCompletion(user?.id, modality, status, side);
      setCurrent(status);

      // 2) persist to wk_prescriptions.status so the generator sees real
      //    completion tomorrow (best-effort; never blocks the UI). Side-split
      //    duplicate cards cannot write the shared row status or one side would
      //    incorrectly mark the other side complete.
      if (user?.id && items.length > 0) {
        if (!side) {
          const ids = items.map((r) => r.id);
          const rowStatus = status === "done" ? "completed" : "skipped";
          const { error } = await supabase
            .from("wk_prescriptions" as any)
            .update({ status: rowStatus })
            .in("id", ids);
          if (error) {
            console.warn("wk_prescriptions bulk status update failed", error);
          } else if (status === "done") {
            // Best-effort session-log rows for the Learning Loop.
            const planDate = items[0]?.plan_date;
            if (planDate) {
              supabase.from("wk_session_logs" as any).insert(
                items.map((r) => ({
                  user_id: user.id,
                  prescription_id: r.id,
                  plan_date: r.plan_date,
                  movement_slug: r.movement_slug,
                  sets_completed: r.sets ?? null,
                  reps_completed:
                    r.sets && r.reps
                      ? Array.from({ length: r.sets }, () => r.reps as number)
                      : null,
                  load_used: r.load_pct ?? null,
                  duration_seconds_completed: r.duration_seconds ?? null,
                  distance_feet_completed: r.distance_feet ?? null,
                  total_reps_completed: r.total_reps ?? null,
                  rpe: null,
                })),
              ).then(({ error: logErr }) => {
                if (logErr) console.warn("wk_session_logs bulk insert failed", logErr);
              });
            }
          }
        }
        if (side && status === "done") {
          // Best-effort session-log rows for the Learning Loop.
          const planDate = items[0]?.plan_date;
          if (planDate) {
            supabase.from("wk_session_logs" as any).insert(
              items.map((r) => ({
                user_id: user.id,
                prescription_id: r.id,
                plan_date: r.plan_date,
                movement_slug: r.movement_slug,
                sets_completed: r.sets ?? null,
                reps_completed:
                  r.sets && r.reps
                    ? Array.from({ length: r.sets }, () => r.reps as number)
                    : null,
                load_used: r.load_pct ?? null,
                duration_seconds_completed: r.duration_seconds ?? null,
                distance_feet_completed: r.distance_feet ?? null,
                total_reps_completed: r.total_reps ?? null,
                rpe: null,
                notes: `${side}-side bat speed completed`,
              })),
            ).then(({ error: logErr }) => {
              if (logErr) console.warn("wk_session_logs bulk insert failed", logErr);
            });
          }
        }
        // 3) mirror to the checklist so per-row checkboxes flip together
        const seeds: TaskSeed[] = items.map((r) => ({
          taskId: r.id,
          source: "wk_prescription",
          sourceRef: r.slot,
          side,
          payload: { name: r.movement_name, slug: r.movement_slug, side },
        }));
        void tasks.bulkSet(seeds, status === "done");
        qc.invalidateQueries({ queryKey: ["wk-rx", user.id] });
      }

      if (status === "done") {
        toast.success(`${modalityLabel} — done. ${encouragement}`, {
          duration: 10_000,
          action: { label: "Undo", onClick: () => void undo() },
        });
        const domain = MODALITY_DOMAIN[modality];
        if (domain) {
          emitVideoMoment({
            kind: "plan_card_complete",
            skillDomain: domain,
            movementPatterns: items
              .map((r) => r.movement_slug)
              .filter((x): x is string => !!x)
              .slice(0, 6),
            side: side === "L" ? "left" : side === "R" ? "right" : null,
            label: modalityLabel,
            sourceId: `${modality}:${planDate}`,
          });
        }
      } else {
        toast(`${modalityLabel} skipped — Hammer will adjust the rest of today.`, {
          duration: 10_000,
          action: { label: "Undo", onClick: () => void undo() },
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Button
        size="sm"
        variant={current === "done" ? "default" : "outline"}
        onClick={() => mark("done")}
        disabled={busy}
        className="h-7 text-[11px] gap-1"
        title={`Mark ${modalityLabel} done — feeds streaks + tomorrow's plan`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        {current === "done" ? "Done" : "Mark done"}
      </Button>
      <Button
        size="sm"
        variant={current === "skipped" ? "secondary" : "ghost"}
        onClick={() => mark("skipped")}
        disabled={busy}
        className="h-7 text-[11px] gap-1"
        title="Skip — Hammer trims remaining volume so today still finishes clean"
      >
        <X className="h-3 w-3" />
        {current === "skipped" ? "Skipped" : "Skip"}
      </Button>
      {current && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void undo()}
          disabled={busy}
          className="h-7 text-[11px] text-muted-foreground"
          title="Take that back — this card goes back to untouched"
        >
          Undo
        </Button>
      )}
    </div>
  );
}
