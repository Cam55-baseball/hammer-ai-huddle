import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import type { MindContentRow, PlayerTags } from "@/lib/hammer/mindContent";

/** Owner rows for Game situations and coach advice. A failed read falls back to the built-ins. */
export function useMindContentRows() {
  return useQuery({
    queryKey: ["plan-mind-content"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MindContentRow[]> => {
      const { data, error } = await supabase.from("plan_mind_content").select("*");
      if (error) return [];
      return (data ?? []) as MindContentRow[];
    },
  });
}

/** The player's own sport, position, level and programs for tag matching. */
export function usePlayerTags(): PlayerTags {
  const { modules } = useSubscription();
  const sport = typeof window !== "undefined" && localStorage.getItem("selectedSport") === "softball" ? "softball" : "baseball";
  const { data } = useQuery({
    queryKey: ["player-mind-tags"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { position: null, level: null };
      const [mpi, prof] = await Promise.all([
        supabase.from("athlete_mpi_settings").select("primary_position").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("profiles").select("experience_level").eq("id", auth.user.id).maybeSingle(),
      ]);
      return { position: mpi.data?.primary_position ?? null, level: prof.data?.experience_level ?? null };
    },
  });
  return { sport, modules, position: data?.position ?? null, level: data?.level ?? null };
}
