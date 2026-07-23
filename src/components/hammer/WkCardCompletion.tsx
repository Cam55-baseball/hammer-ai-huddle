/**
 * WkCardCompletion — card-level Done/Skip for the four Wk workout cards
 * (Lifts, Speed, Bat-Speed, Conditioning).
 *
 * Persists:
 *   - Local engagement state via `dailyEngagement.recordCompletion` so the
 *     daily intent header + healing/cadence narrative can react immediately.
 *   - Row-level `wk_prescriptions.status` for every prescription in the slot,
 *     giving the generator a real signal for tomorrow's plan.
 *
 * Presentation-only. Never authors organism truth. Never mutates the ledger.
 */
import { useMemo, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadEngagement,
  recordCompletion,
  todayCompletion,
  type EngagementKey,
} from "@/lib/hammer/prescription/dailyEngagement";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

interface Props {
  readonly modality: EngagementKey;
  readonly modalityLabel: string;
  readonly items: ReadonlyArray<WkRx>;
}

export function WkCardCompletion({ modality, modalityLabel, items }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(() =>
    todayCompletion(loadEngagement(user?.id), modality),
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

  async function mark(status: "done" | "skipped") {
    if (busy) return;
    setBusy(true);
    try {
      // 1) local engagement — drives Daily Intent header + healing narrative
      recordCompletion(user?.id, modality, status);
      setCurrent(status);

      // 2) persist to wk_prescriptions.status so the generator sees real
      //    completion tomorrow (best-effort; never blocks the UI).
      if (user?.id && items.length > 0) {
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
        qc.invalidateQueries({ queryKey: ["wk-rx", user.id] });
      }

      if (status === "done") {
        toast.success(`${modalityLabel} — done. ${encouragement}`);
      } else {
        toast(`${modalityLabel} skipped — Hammer will adjust the rest of today.`);
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
    </div>
  );
}
