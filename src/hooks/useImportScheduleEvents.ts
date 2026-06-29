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
  errors: string[];
}

export function useImportScheduleEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (events: ParsedScheduleEvent[]): Promise<ImportSummary> => {
      if (!user?.id) throw new Error("Sign in required to import a schedule.");
      const uid = user.id;
      const summary: ImportSummary = { inserted: 0, failed: 0, errors: [] };

      const gameRows: Array<Record<string, unknown>> = [];
      const sessionRows: Array<Record<string, unknown>> = [];

      const lineage = {
        source: "ai_schedule_import",
        imported_at: new Date().toISOString(),
      };

      // Resolve athlete defaults once. The `games` table requires team_name,
      // league_level, and field distances NOT NULL — none are captured by the
      // importer UI, so fall back to safe athlete-scoped defaults.
      const [{ data: profile }, { data: settings }] = await Promise.all([
        (supabase as any).from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        (supabase as any).from("athlete_mpi_settings").select("sport").eq("user_id", uid).maybeSingle(),
      ]);
      const defaultSport = settings?.sport || "baseball";

      for (const ev of events) {
        const day = ev.start_date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          summary.failed += 1;
          summary.errors.push(`Bad date for "${ev.title}"`);
          continue;
        }
        if (ev.kind === "game" || ev.kind === "tournament_day") {
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
        const { error } = await (supabase as any).from("gp_games").insert(gameRows);
        if (error) {
          summary.failed += gameRows.length;
          summary.errors.push(`Games: ${error.message}`);
        } else {
          summary.inserted += gameRows.length;
        }
      }
      if (sessionRows.length) {
        const { error } = await (supabase as any)
          .from("scheduled_practice_sessions")
          .insert(sessionRows);
        if (error) {
          summary.failed += sessionRows.length;
          summary.errors.push(`Sessions: ${error.message}`);
        } else {
          summary.inserted += sessionRows.length;
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
      qc.invalidateQueries({ queryKey: ["season-status"] });
    },
  });
}
