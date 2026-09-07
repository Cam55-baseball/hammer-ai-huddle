/**
 * ScheduleAdjustmentNotice — says out loud which game changed today's session.
 *
 * The old behaviour adjusted the plan silently, so an athlete saw a lighter
 * day with no explanation and no way to argue with it. This names the game and
 * the date, and gives one tap to say "No game then" when the schedule is wrong.
 *
 * Display-only: it renders what the generator already decided and, on the
 * override tap, marks the game as not-for-training and asks for a regenerate.
 * It never computes a dose.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarClock, Undo2 } from "lucide-react";
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
  reasons?: string[];
}

export function ScheduleAdjustmentNotice({
  schedule,
  onChanged,
}: {
  schedule: ScheduleNoticeData | null | undefined;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!schedule) return null;
  const changed = schedule.primer_only || schedule.lift_removed || schedule.zero_exposure_relief;
  if (!changed) return null;

  const game = schedule.driving_game ?? null;

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
    qc.invalidateQueries({ queryKey: ["wk-rx"] });
    qc.invalidateQueries({ queryKey: ["schedule-window-games"] });
    onChanged?.();
  };

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">
            {schedule.headline ?? "Today's session was adjusted around your schedule."}
          </p>
          {(schedule.reasons ?? []).length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(schedule.reasons ?? []).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
          {game?.id && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={busy}
              onClick={dismissGame}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              No game {game.whenLabel.startsWith("today") ? "today" : "then"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
