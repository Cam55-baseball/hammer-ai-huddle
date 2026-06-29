/**
 * useEventStatusMutation — cancel / reschedule / restore games & practices.
 *
 * Status values are standardized as:
 *   - 'scheduled' (default)
 *   - 'canceled'
 *   - 'rescheduled' (legacy tombstone — treated like canceled for filtering)
 *
 * Rescheduling updates the date in place (no parallel tombstone row). This
 * keeps the lineage of the canonical row intact and matches what a user
 * expects when they say "the game moved."
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EventKind = "game" | "practice";
export type EventStatus = "scheduled" | "canceled";

const TABLE: Record<EventKind, string> = {
  game: "gp_games",
  practice: "scheduled_practice_sessions",
};
const DATE_COL: Record<EventKind, string> = {
  game: "game_date",
  practice: "scheduled_date",
};

function invalidateScheduleQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["schedule-window-games"] });
  qc.invalidateQueries({ queryKey: ["schedule-window-practices"] });
  qc.invalidateQueries({ queryKey: ["gameday-recent-games"] });
  qc.invalidateQueries({ queryKey: ["game-day-context"] });
  qc.invalidateQueries({ queryKey: ["hammer-daily-plan"] });
  qc.invalidateQueries({ queryKey: ["calendar-projection"] });
  qc.invalidateQueries({ queryKey: ["season-status"] });
}

export function useEventStatusMutation() {
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      kind,
      status,
    }: {
      id: string;
      kind: EventKind;
      status: EventStatus;
    }) => {
      const { error } = await (supabase as any)
        .from(TABLE[kind])
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidateScheduleQueries(qc);
      toast.success(vars.status === "canceled" ? "Event canceled" : "Event restored");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Could not update event");
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({
      id,
      kind,
      newDate,
    }: {
      id: string;
      kind: EventKind;
      newDate: string; // YYYY-MM-DD
    }) => {
      const payload: Record<string, string> = {
        [DATE_COL[kind]]: newDate,
        status: "scheduled",
      };
      const { error } = await (supabase as any)
        .from(TABLE[kind])
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(qc);
      toast.success("Event rescheduled");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Could not reschedule event");
    },
  });

  return { setStatus, reschedule };
}
