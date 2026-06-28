import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IqSituation, IqActor, IqScenario, IqSport, IqLens } from "@/lib/iq/types";

export function useIqSituations(sport: IqSport, lens?: IqLens) {
  return useQuery({
    queryKey: ["iq-situations", sport, lens ?? "all"],
    queryFn: async () => {
      const sportFilter = sport === "both" ? ["baseball","softball","both"] : [sport, "both"];
      let q = supabase
        .from("iq_situations")
        .select("*")
        .in("sport", sportFilter)
        .eq("status", "published")
        .order("canonical_order", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as IqSituation[];
      return lens ? rows.filter((r) => r.lens_tags?.includes(lens)) : rows;
    },
  });
}

export function useIqSituation(slug: string, sport: IqSport) {
  return useQuery({
    queryKey: ["iq-situation", sport, slug],
    queryFn: async () => {
      const sportFilter = sport === "both" ? ["baseball","softball","both"] : [sport, "both"];
      const { data: sit, error } = await supabase
        .from("iq_situations")
        .select("*")
        .in("sport", sportFilter)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!sit) return null;

      const [actorsRes, scenariosRes] = await Promise.all([
        supabase.from("iq_situation_actors").select("*").eq("situation_id", sit.id),
        supabase.from("iq_scenarios").select("*").eq("situation_id", sit.id),
      ]);
      if (actorsRes.error) throw actorsRes.error;
      if (scenariosRes.error) throw scenariosRes.error;

      return {
        situation: sit as unknown as IqSituation,
        actors: (actorsRes.data ?? []) as unknown as IqActor[],
        scenarios: (scenariosRes.data ?? []) as unknown as IqScenario[],
      };
    },
    enabled: !!slug,
  });
}
