import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { growthMode, type GrowthModeState } from "../../supabase/functions/_shared/wic/growth/growthMode";

/** Same height rule the planner uses, read from the same height history. */
export function useGrowthMode() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["growth-mode", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<GrowthModeState & { lastCheck: string | null }> => {
      const since = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("athlete_height_checks")
        .select("measured_on, inches")
        .eq("user_id", user!.id)
        .gte("measured_on", since)
        .order("measured_on");
      const rows = ((data ?? []) as any[]).map((r) => ({ date: String(r.measured_on), inches: Number(r.inches) }));
      const today = new Date().toLocaleDateString("en-CA");
      const s = growthMode(rows, today);
      const { data: last } = await supabase
        .from("athlete_height_checks").select("measured_on").eq("user_id", user!.id)
        .order("measured_on", { ascending: false }).limit(1).maybeSingle();
      return { ...s, lastCheck: (last as any)?.measured_on ?? null };
    },
  });
}
