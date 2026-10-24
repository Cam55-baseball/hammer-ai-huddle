import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutActual } from "@/lib/coachRx/results";

/** Self-owned canonical logs, shared by History, Vault and The General. */
export function useWorkoutActuals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workout-actuals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("wk_session_logs")
        .select("id,plan_date,movement_slug,sets_completed,reps_completed,total_reps_completed,duration_seconds_precise,duration_seconds_completed,distance_feet_completed,prescription:wk_prescriptions(movement_name,dosage_unit,slot,why_payload)")
        .eq("user_id", user.id).order("plan_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as WorkoutActual[];
    },
    refetchInterval: 30_000,
  });
}