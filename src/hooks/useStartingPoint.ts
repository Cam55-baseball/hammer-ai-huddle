import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { areaWeeks, mondayOf, type GreenlightArea } from "../../supabase/functions/_shared/wic/progression/greenlight";
import {
  answersComplete, historyWins, programOf, startingLevels, EASING_BACK_LIFT_SHARE,
  type Answers, type Program, type Sport, type StartingLevels,
} from "../../supabase/functions/_shared/wic/progression/startingPoint";
import type { GreenlightStarts, GreenlightTargets } from "@/lib/hammer/prescription/greenlightPlan";

export const startingPointKey = (userId: string | undefined, sport: string) => ["starting-point", userId, sport];

export interface StartingPointRow { answers: Answers; updated_at: string; updated_by: string | null }

export function useStartingPointAnswers(userId: string | undefined, sport: Sport) {
  return useQuery<StartingPointRow | null>({
    queryKey: startingPointKey(userId, sport),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("athlete_starting_points").select("answers, updated_at, updated_by").eq("user_id", userId!).eq("sport", sport).maybeSingle();
      if (error) throw error;
      return (data as StartingPointRow | null) ?? null;
    },
  });
}

/** Save answers (who/when is logged by the database). */
export async function saveStartingPoint(userId: string, sport: Sport, program: Program, answers: Answers): Promise<string | null> {
  const { error } = await supabase.from("athlete_starting_points").upsert({ user_id: userId, sport, program, answers, updated_by: userId }, { onConflict: "user_id,sport" });
  return error ? "We couldn't save your answers. Check your connection and try again." : null;
}

export function useInvalidateStartingPoint() {
  const qc = useQueryClient();
  return (userId: string | undefined, sport: string) => qc.invalidateQueries({ queryKey: startingPointKey(userId, sport) });
}

export interface PlanStarts {
  program: Program | null;
  levels: StartingLevels | null;
  starts: GreenlightStarts;
  targets: GreenlightTargets;
  startThrowsPerWeek: number | null;
  /** Areas where 2+ logged weeks in the last 28 days replaced the answers. */
  historyAreas: GreenlightArea[];
}

/** Turn saved answers into plan starts; areas with 2 logged weeks in 28 days use history instead. */
export function planStartsFrom(sport: Sport, modules: readonly string[], answers: Answers | null | undefined, loggedWeeks: Partial<Record<GreenlightArea, number>>, positionWeekLow: number | null): PlanStarts {
  const program = programOf(sport, modules);
  const empty: PlanStarts = { program, levels: null, starts: {}, targets: {}, startThrowsPerWeek: null, historyAreas: [] };
  if (!program || !answers || !answersComplete(sport, program, answers)) return empty;
  const levels = startingLevels(sport, program, answers, positionWeekLow);
  const historyAreas = (Object.keys(loggedWeeks) as GreenlightArea[]).filter((a) => historyWins(loggedWeeks[a] ?? 0));
  const use = (a: GreenlightArea) => !historyAreas.includes(a);
  const starts: GreenlightStarts = {};
  if (use("lifting") && levels.lifting === "easing_back") starts.lifting = EASING_BACK_LIFT_SHARE;
  const targets: GreenlightTargets = {
    hitting: use("hitting") ? levels.swingsPerSession : null,
    defense: use("defense") ? levels.defenseRepsPerSession : null,
    speed: use("speed") ? levels.sprintYards : null,
  };
  return { program, levels, starts, targets, startThrowsPerWeek: use("throwing") ? levels.throwsPerWeek : null, historyAreas };
}

/** Logged weeks per area in the last 28 days (finished weeks plus this one). */
export function useLoggedWeeks28(userId: string | undefined, today: string) {
  return useQuery<Partial<Record<GreenlightArea, number>> | null>({
    queryKey: ["logged-weeks-28", userId, today],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const from = new Date(new Date(`${today}T12:00:00Z`).getTime() - 27 * 86_400_000).toISOString().slice(0, 10);
      const [rx, logs] = await Promise.all([
        supabase.from("wk_prescriptions").select("id, plan_date, slot").eq("user_id", userId!).gte("plan_date", from).lte("plan_date", today).limit(3000),
        supabase.from("wk_session_logs").select("prescription_id").eq("user_id", userId!).gte("plan_date", from).lte("plan_date", today).limit(3000),
      ]);
      if (rx.error || logs.error) return null;
      const logged = new Set(((logs.data ?? []) as any[]).map((l) => l.prescription_id).filter(Boolean));
      // Count this week too: pass the day after this week's Sunday as "today".
      const after = new Date(`${mondayOf(today)}T12:00:00Z`); after.setUTCDate(after.getUTCDate() + 7);
      const weeks = areaWeeks(after.toISOString().slice(0, 10), (rx.data ?? []) as any[], logged);
      const out: Partial<Record<GreenlightArea, number>> = {};
      for (const [a, w] of Object.entries(weeks)) out[a as GreenlightArea] = w.filter((x) => x.completed > 0).length;
      return out;
    },
  });
}
