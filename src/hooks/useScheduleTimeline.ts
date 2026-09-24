/**
 * useScheduleTimeline — the one reader/writer for the Tell Hammers timeline.
 * Every module that needs athlete-told schedule facts reads through here (app)
 * or through the shared pure module (plan builder).
 */
import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { getTodayDate } from "@/utils/dateUtils";
import {
  isoShift,
  nextHeavyDay,
  whatChanged,
  type TimelineEntry,
  type TimelineSource,
} from "../../supabase/functions/_shared/wic/schedule/timeline";
import type { EntryDraft } from "@/lib/hammer/tellHammers/parse";
import { reportInjury } from "@/lib/hammer/injury/reportInjury";
import { FACE_SEVERITY } from "@/lib/hammer/tellHammers/parse";

export const TIMELINE_QUERY_KEY = "schedule-timeline";
export const SCHEDULE_CHANGED_EVENT = "hammer:schedule-changed";

export interface SaveResult {
  merged: boolean;
  entry: TimelineEntry;
  message: string;
}

/** Tell Hammers switch for the signed-in athlete. Off unless the switch includes them. */
export function useTellHammersEnabled(): boolean {
  const { user } = useOptionalAuth();
  const q = useQuery({
    queryKey: ["feature-switch", "tell_hammers", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("wk_feature_switches" as any)
        .select("mode, allowlist")
        .eq("feature_key", "tell_hammers")
        .maybeSingle();
      const row = data as any;
      if (!row || !user?.id) return false;
      if (row.mode === "all") return true;
      if ((row.mode === "pilot" || row.mode === "self") && Array.isArray(row.allowlist)) return row.allowlist.includes(user.id);
      return false;
    },
  });
  return q.data === true;
}

export function useScheduleTimeline(enabledOverride?: boolean) {
  const { user } = useOptionalAuth();
  const switchOn = useTellHammersEnabled();
  const enabled = (enabledOverride ?? switchOn) && !!user?.id;
  const qc = useQueryClient();
  const today = getTodayDate();

  const q = useQuery({
    queryKey: [TIMELINE_QUERY_KEY, user?.id],
    enabled,
    staleTime: 15_000,
    queryFn: async (): Promise<TimelineEntry[]> => {
      const { data, error } = await supabase
        .from("schedule_timeline_entries" as any)
        .select("id, tag, start_date, end_date, dates, source, payload, summary, created_at, undone_at")
        .eq("user_id", user!.id)
        .gte("end_date", isoShift(today, -30))
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as TimelineEntry[];
    },
  });

  // Another device (or the plan builder) changed the timeline → refresh here too.
  useEffect(() => {
    if (!enabled || !user?.id) return;
    const ch = supabase
      .channel(`timeline-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "schedule_timeline_entries", filter: `user_id=eq.${user.id}` },
        () => announceChange(qc, user.id, null),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [enabled, user?.id, qc]);

  const entries = q.data ?? [];

  const gameDatesOutsideTimeline = useCallback(async (): Promise<string[]> => {
    if (!user?.id) return [];
    const { data } = await (supabase as any)
      .from("gp_games")
      .select("game_date")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("game_date", today)
      .lte("game_date", isoShift(today, 21))
      .not("status", "in", "(canceled,cancelled,rescheduled)");
    return ((data ?? []) as any[]).map((r) => String(r.game_date));
  }, [user?.id, today]);

  const save = useCallback(
    async (draft: EntryDraft, source: TimelineSource): Promise<SaveResult> => {
      if (!user?.id) throw new Error("Sign in first");
      const otherGames = await gameDatesOutsideTimeline();
      const heavyBefore = nextHeavyDay(entries, otherGames, today);

      let linkedRef: string | null = null;
      if (draft.tag === "PAIN") {
        // Pain always runs through the existing pain rules — never a lighter path.
        const face = String(draft.payload.face ?? "little") as keyof typeof FACE_SEVERITY;
        const res = await reportInjury({
          userId: user.id,
          region: draft.payload.region as any,
          severity: FACE_SEVERITY[face] ?? "sore",
          note: "Reported through Tell Hammers",
          queryClient: qc,
        });
        linkedRef = res.eventId;
      }

      const provisional = { ...draft, id: "new", source, summary: "", created_at: new Date().toISOString(), undone_at: null } as TimelineEntry;
      const heavyAfter = nextHeavyDay([provisional, ...entries], otherGames, today);
      const { data, error } = await (supabase as any).rpc("tell_hammers_save", {
        p_tag: draft.tag,
        p_start: draft.start_date,
        p_end: draft.end_date,
        p_dates: draft.dates,
        p_source: source,
        p_payload: draft.payload,
        p_summary: "",
        p_linked_ref: linkedRef,
      });
      if (error) throw error;
      const merged = !!data?.merged;
      const entry = data?.entry as TimelineEntry;
      const message = whatChanged({ entry, merged, heavyBefore, heavyAfter });
      await (supabase as any).from("schedule_timeline_entries").update({ summary: message }).eq("id", entry.id);
      announceChange(qc, user.id, message);
      return { merged, entry: { ...entry, summary: message }, message };
    },
    [user?.id, entries, today, qc, gameDatesOutsideTimeline],
  );

  const undo = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false;
      const { data, error } = await (supabase as any).rpc("tell_hammers_undo", { p_id: id });
      if (error) throw error;
      if (data) announceChange(qc, user.id, "Undone — Hammer put your plan back.");
      return !!data;
    },
    [user?.id, qc],
  );

  return { enabled, switchOn, entries, loading: q.isLoading, save, undo };
}

/** Refresh every module that reads the schedule and ask today's plan to re-plan. */
export function announceChange(qc: ReturnType<typeof useQueryClient>, userId: string, reason: string | null) {
  qc.invalidateQueries({ queryKey: [TIMELINE_QUERY_KEY, userId] });
  for (const k of [
    "schedule-window-games",
    "schedule-window-practices",
    "schedule-window-timeline",
    "game-day-context",
    "wk-rx-game-day",
    "wk-rx-practice-day",
    "wk-rx-timeline",
    "calendar-projection",
    "hammer-daily-plan",
  ]) {
    qc.invalidateQueries({ queryKey: [k] });
  }
  if (reason !== null && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCHEDULE_CHANGED_EVENT, { detail: { reason } }));
  }
}
