/**
 * useImportScheduleEvents — persists athlete-approved parsed schedule rows
 * to the canonical scheduling tables. RLS gates writes to `auth.uid()`.
 *
 * Routing:
 *   • game / tournament_day → public.games (game_date, opponent_name, venue,
 *                              status='scheduled', game_summary stores
 *                              import lineage so review is replayable).
 *   • practice              → public.scheduled_practice_sessions.
 *   • travel / other        → public.scheduled_practice_sessions with
 *                              session_module='note' so the day surfaces on
 *                              the calendar without being prescribed work.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ParsedKind = "game" | "tournament_day" | "practice" | "travel" | "other";

export interface ParsedScheduleEvent {
  kind: ParsedKind;
  start_date: string;
  end_date: string;
  title: string;
  opponent?: string | null;
  location?: string | null;
  time_local?: string | null;
  confidence: "high" | "medium" | "low";
  source_snippet: string;
}

export interface ImportSummary {
  inserted: number;
  failed: number;
  skipped: number;
  errors: string[];
  /** IDs of rows just inserted, for 24h undo. */
  insertedGameIds: string[];
  insertedSessionIds: string[];
}

export function useImportScheduleEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (events: ParsedScheduleEvent[]): Promise<ImportSummary> => {
      if (!user?.id) throw new Error("Sign in required to import a schedule.");
      const uid = user.id;
      const summary: ImportSummary = {
        inserted: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        insertedGameIds: [],
        insertedSessionIds: [],
      };

      const gameRows: Array<Record<string, unknown>> = [];
      const sessionRows: Array<Record<string, unknown>> = [];

      const lineage = {
        source: "ai_schedule_import",
        imported_at: new Date().toISOString(),
      };

      const [{ data: settings }] = await Promise.all([
        (supabase as any).from("athlete_mpi_settings").select("sport").eq("user_id", uid).maybeSingle(),
      ]);
      const defaultSport = settings?.sport || "baseball";

      // ---------- Duplicate detection ----------
      // Pull every existing row whose date falls inside the imported window.
      const dates = Array.from(new Set(events.map((e) => e.start_date).filter(Boolean)));
      const dupGames = new Set<string>();
      const dupSessions = new Set<string>();
      if (dates.length) {
        const [existingGames, existingSessions] = await Promise.all([
          (supabase as any)
            .from("gp_games")
            .select("game_date,opponent_team")
            .eq("user_id", uid)
            .in("game_date", dates),
          (supabase as any)
            .from("scheduled_practice_sessions")
            .select("scheduled_date,title")
            .eq("user_id", uid)
            .in("scheduled_date", dates),
        ]);
        for (const g of existingGames?.data ?? []) {
          dupGames.add(`${g.game_date}::${(g.opponent_team ?? "").toLowerCase().trim()}`);
        }
        for (const s of existingSessions?.data ?? []) {
          dupSessions.add(`${s.scheduled_date}::${(s.title ?? "").toLowerCase().trim()}`);
        }
      }

      for (const ev of events) {
        const day = ev.start_date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          summary.failed += 1;
          summary.errors.push(`Bad date for "${ev.title}"`);
          continue;
        }
        if (ev.kind === "game" || ev.kind === "tournament_day") {
          const key = `${day}::${(ev.opponent ?? ev.title ?? "").toLowerCase().trim()}`;
          if (dupGames.has(key)) {
            summary.skipped += 1;
            continue;
          }
          dupGames.add(key);
          gameRows.push({
            user_id: uid,
            game_date: day,
            opponent_team: ev.opponent ?? ev.title,
            venue: ev.location ?? null,
            status: "scheduled",
            game_type: ev.kind === "tournament_day" ? "tournament" : "regular_season",
            sport: defaultSport,
            game_summary: {
              ...lineage,
              title: ev.title,
              kind: ev.kind,
              confidence: ev.confidence,
              source_snippet: ev.source_snippet,
              time_local: ev.time_local ?? null,
            },
          });
        } else {
          const key = `${day}::${(ev.title ?? "").toLowerCase().trim()}`;
          if (dupSessions.has(key)) {
            summary.skipped += 1;
            continue;
          }
          dupSessions.add(key);
          const module_ =
            ev.kind === "practice" ? "practice" :
            ev.kind === "travel" ? "note" : "note";
          sessionRows.push({
            user_id: uid,
            created_by: uid,
            session_module: module_,
            session_type: ev.kind,
            title: ev.title,
            description: [
              ev.location ? `Location: ${ev.location}` : null,
              ev.time_local ? `Time: ${ev.time_local}` : null,
              `Imported from AI schedule (${ev.confidence}). "${ev.source_snippet}"`,
            ].filter(Boolean).join("\n"),
            scheduled_date: day,
            start_time: ev.time_local ?? null,
            sport: "baseball",
            status: "scheduled",
          });
        }
      }

      if (gameRows.length) {
        const { data, error } = await (supabase as any)
          .from("gp_games")
          .insert(gameRows)
          .select("id");
        if (error) {
          summary.failed += gameRows.length;
          summary.errors.push(`Games: ${error.message}`);
        } else {
          summary.inserted += gameRows.length;
          for (const r of (data ?? []) as Array<{ id: string }>) {
            if (r?.id) summary.insertedGameIds.push(r.id);
          }
        }
      }
      if (sessionRows.length) {
        const { data, error } = await (supabase as any)
          .from("scheduled_practice_sessions")
          .insert(sessionRows)
          .select("id");
        if (error) {
          summary.failed += sessionRows.length;
          summary.errors.push(`Sessions: ${error.message}`);
        } else {
          summary.inserted += sessionRows.length;
          for (const r of (data ?? []) as Array<{ id: string }>) {
            if (r?.id) summary.insertedSessionIds.push(r.id);
          }
        }
      }

      return summary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-projection"] });
      qc.invalidateQueries({ queryKey: ["schedule-window-games"] });
      qc.invalidateQueries({ queryKey: ["schedule-window-practices"] });
      qc.invalidateQueries({ queryKey: ["game-day-context"] });
      qc.invalidateQueries({ queryKey: ["hammer-daily-plan"] });
      qc.invalidateQueries({ queryKey: ["wk-rx"] });
      qc.invalidateQueries({ queryKey: ["wk-rx-game-day"] });
      qc.invalidateQueries({ queryKey: ["season-status"] });
    },
  });
}

/**
 * Undo a recent import within the 24h window. Hard-deletes by ID. RLS
 * still enforces ownership, so a stolen ID list can't be misused.
 */
export async function undoScheduleImport(input: {
  gameIds: string[];
  sessionIds: string[];
}): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  let removed = 0;
  if (input.gameIds.length) {
    const { error, count } = await (supabase as any)
      .from("gp_games")
      .delete({ count: "exact" })
      .in("id", input.gameIds);
    if (error) errors.push(`Games: ${error.message}`);
    else removed += count ?? 0;
  }
  if (input.sessionIds.length) {
    const { error, count } = await (supabase as any)
      .from("scheduled_practice_sessions")
      .delete({ count: "exact" })
      .in("id", input.sessionIds);
    if (error) errors.push(`Sessions: ${error.message}`);
    else removed += count ?? 0;
  }
  return { removed, errors };
}
