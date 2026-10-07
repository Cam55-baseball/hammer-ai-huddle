import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { liftPlateau, verifiedMax, type LogRow } from "@/lib/lift/verifiedMax";

/** Verified max for one movement from the player's own logs; null until verified. */
function useLiftLogs(movementSlug: string | null | undefined, enabled: boolean) {
  const { user } = useOptionalAuth();
  const q = useQuery({
    queryKey: ["verified-max", user?.id, movementSlug],
    enabled: !!user?.id && !!movementSlug && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_session_logs" as any)
        .select("plan_date, load_used, reps_completed, metrics")
        .eq("user_id", user!.id)
        .eq("movement_slug", movementSlug!)
        .not("load_used", "is", null)
        .order("plan_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as unknown as LogRow[];
      return { max: verifiedMax(rows), plateau: liftPlateau(rows) };
    },
  });
  return q.data ?? null;
}
export function useVerifiedMax(movementSlug: string | null | undefined, enabled = true) {
  return useLiftLogs(movementSlug, enabled)?.max ?? null;
}
/** True after 3 logged sessions in a row with no new best (Round 8 Step 4). */
export function useLiftPlateau(movementSlug: string | null | undefined, enabled = true) {
  return useLiftLogs(movementSlug, enabled)?.plateau ?? false;
}
