import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Track-record / calibration reads for the signed-in evaluator.
 *
 * Both RPCs are security-definer and scoped to auth.uid() server-side — the
 * client cannot request another user's calibration. Nothing here is smoothed,
 * imputed or previewed: when the sample is empty the card says so.
 */

export interface ScoutToolCalibration {
  tool: string;
  pairs: number;
  avg_scout: number;
  avg_system: number;
  /** scout minus system. Positive = grades higher than measurement. */
  signed_dev: number | null;
  /** mean absolute distance from the system grade. */
  abs_dev: number | null;
}

export interface ScoutCalibration {
  reports: number;
  athletes_graded: number;
  per_tool: ScoutToolCalibration[];
  total_pairs: number;
  avg_abs_deviation: number | null;
  avg_signed_deviation: number | null;
  high_graded_athletes: number;
  high_graded_with_success: number;
}

export interface CoachCalibrationPlayer {
  athlete_id: string;
  coached_since: string;
  grade_count: number;
  first_overall: number;
  last_overall: number;
  delta: number;
  display_name?: string;
}

export interface CoachCalibration {
  roster_size: number;
  players_with_delta: number;
  avg_delta: number | null;
  improved: number;
  declined: number;
  flat: number;
  best_delta: number | null;
  full_season_players: number;
  full_season_with_success: number;
  players: CoachCalibrationPlayer[];
}

export function useScoutCalibration(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scout-calibration", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ScoutCalibration | null> => {
      const { data, error } = await (supabase as any).rpc("scout_calibration_summary");
      if (error) throw error;
      return (data as ScoutCalibration) ?? null;
    },
  });
}

export function useCoachCalibration(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-calibration", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CoachCalibration | null> => {
      const { data, error } = await (supabase as any).rpc("coach_calibration_summary");
      if (error) throw error;
      const summary = (data as CoachCalibration) ?? null;
      if (!summary?.players?.length) return summary;
      // Hydrate athlete names from the public profile view (best-effort).
      const ids = summary.players.map((p) => p.athlete_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name")
        .in("id", ids);
      const names = new Map<string, string>(
        ((profiles ?? []) as any[]).map((p) => [p.id, p.full_name ?? "Athlete"]),
      );
      return {
        ...summary,
        players: summary.players.map((p) => ({
          ...p,
          display_name: names.get(p.athlete_id) ?? "Athlete",
        })),
      };
    },
  });
}

export const TOOL_LABELS: Record<string, string> = {
  hitting: "Hit",
  power: "Power",
  speed: "Run",
  throwing: "Arm",
  defense: "Field",
  fastball: "Fastball",
  control: "Control",
  delivery: "Delivery",
};

/** Plain-language read of a signed deviation. */
export function calibrationTone(signed: number | null): {
  label: string;
  className: string;
} {
  if (signed == null) return { label: "Not enough data", className: "text-muted-foreground" };
  if (Math.abs(signed) < 2.5) return { label: "In line with measurement", className: "text-emerald-600 dark:text-emerald-400" };
  if (signed > 0) return { label: `Grades ${signed.toFixed(1)} pts easy`, className: "text-amber-600 dark:text-amber-400" };
  return { label: `Grades ${Math.abs(signed).toFixed(1)} pts harsh`, className: "text-sky-600 dark:text-sky-400" };
}
