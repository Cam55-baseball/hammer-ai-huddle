/**
 * ScheduleAdjustmentNotice — says out loud which game changed today's session,
 * and gives the athlete two honest, different answers to it:
 *
 *   "No game then"  — the game isn't real. Correct the data.
 *   "Lift anyway"   — the game is real, and I want a full session today.
 *
 * The second one relaxes the schedule-derived caps only (the 48-hour primer and
 * the game-day lift removal). It never touches age gates, training-age gates,
 * deep_flexion / eccentric_overload / shoulder_end_range, the CNS cap, season
 * legality, or the day-before-a-start protection — those are decided in the
 * generator and this component cannot reach them.
 *
 * Display-only: it renders what the generator already decided, writes the
 * athlete's choice, and asks for a regenerate. It never computes a dose.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, Dumbbell, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface ScheduleNoticeData {
  headline?: string | null;
  driving_game?: {
    id: string | null;
    date: string;
    time: string;
    assumedTime: boolean;
    label: string | null;
    source: "gp_games" | "calendar_events";
    whenLabel: string;
  } | null;
  primer_only?: boolean;
  lift_removed?: boolean;
  high_density?: boolean;
  games_per_rolling_week?: number;
  zero_exposure_relief?: boolean;
  assumed_game_time?: boolean;
  override_available?: boolean;
  override_applied?: boolean;
  reasons?: string[];
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleAdjustmentNotice({
  schedule,
  planDate,
  onChanged,
}: {
  schedule: ScheduleNoticeData | null | undefined;
  /** The plan date the override belongs to. Defaults to today. */
  planDate?: string;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!schedule) return null;
  const applied = schedule.override_applied === true;
  const changed =
    schedule.primer_only || schedule.lift_removed || schedule.zero_exposure_relief || applied;
  if (!changed) return null;

  const game = schedule.driving_game ?? null;
  const date = planDate ?? todayIso();
  const canOverride = schedule.override_available === true && !applied;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wk-rx"] });
    qc.invalidateQueries({ queryKey: ["schedule-window-games"] });
    onChanged?.();
  };

  const dismissGame = async () => {
    if (!game?.id) return;
    setBusy(true);
    const table = game.source === "gp_games" ? "gp_games" : "calendar_events";
    const { error } = await (supabase as any)
      .from(table)
      .update({ ignored_for_training: true })
      .eq("id", game.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't update that game");
      return;
    }
    toast.success("Got it — that game won't change your training.", {
      description: "It stays on your schedule. Undo any time from the game itself.",
    });
    refresh();
  };

  const liftAnyway = async () => {
    if (!user?.id) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("wk_schedule_overrides")
      .upsert(
        {
          user_id: user.id,
          plan_date: date,
          kind: "lift_anyway",
          reason: schedule.headline ?? "game-day schedule cap",
        },
        { onConflict: "user_id,plan_date,kind" },
      );
    setBusy(false);
    setConfirmOpen(false);
    if (error) {
      toast.error("Couldn't apply that");
      return;
    }
    toast.success("Full session today.", { description: "Just today — tomorrow goes back to normal." });
    refresh();
  };

  const undoOverride = async () => {
    if (!user?.id) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("wk_schedule_overrides")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_date", date)
      .eq("kind", "lift_anyway");
    setBusy(false);
    if (error) {
      toast.error("Couldn't undo that");
      return;
    }
    toast.success("Back to the lighter session.");
    refresh();
  };

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">
            {applied
              ? "You chose to lift through today's game day."
              : (schedule.headline ?? "Today's session was adjusted around your schedule.")}
          </p>
          {(schedule.reasons ?? []).length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(schedule.reasons ?? []).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {game?.id && !applied && (
              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={dismissGame}>
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                No game {game.whenLabel.startsWith("today") ? "today" : "then"}
              </Button>
            )}
            {canOverride && (
              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setConfirmOpen(true)}>
                <Dumbbell className="mr-1.5 h-3.5 w-3.5" />
                Lift anyway
              </Button>
            )}
            {applied && (
              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={undoOverride}>
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                Go back to the lighter session
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {/* Flex column + scrolling body: the reason can be long, but Cancel and
            "Lift anyway" stay pinned and reachable without scrolling. */}
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-sm flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 p-6 pb-3 pr-12">
            <DialogTitle>Lift anyway?</DialogTitle>
          </DialogHeader>

          <DialogDescription className="sr-only">
            Choosing to lift through today's game day. Safety limits are unchanged.
          </DialogDescription>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4 text-left text-sm text-muted-foreground">
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                Why we hold this back
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/90">
                The game is the point. Heavy lifting inside 48 hours of first pitch usually costs you
                a step in the field and some bat speed at the plate, and the soreness tends to land
                the next day rather than tonight. A primer keeps you sharp without spending anything
                you need for the game.
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/90">
                If you'd still rather lift, that's your call — this is one day, and your safety
                limits don't change either way.
              </p>
            </div>

            <p>
              {game
                ? `You have a game ${game.whenLabel}. Lifting today anyway means a full session instead of a primer.`
                : "Lifting today anyway means a full session instead of a primer."}{" "}
              Your safety limits don't change. Just today.
            </p>
            <p className="text-xs">
              Anything held back for your age, your training age, or because the movement itself
              isn't safe for you right now stays held back. If you're the starting pitcher, the lift
              still comes off — un-mark the start instead.
            </p>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-background p-4">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={liftAnyway} disabled={busy}>
              {busy ? "Applying…" : "Lift anyway"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
