import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalogVisibilityFilter } from "@/lib/catalog/testOnlyVisibility";

/**
 * Authoritative laterality: the movement catalog's `unilateral` flag.
 * Cached for the session — it is reference data, not athlete data.
 */
export function useUnilateralMovements() {
  const query = useQuery({
    queryKey: ["wk-unilateral-movements"],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("wk_movement_catalog")
        .select("slug")
        .eq("unilateral", true)
        .or(catalogVisibilityFilter(auth.user?.id));
      if (error) throw error;
      return new Set(((data ?? []) as Array<{ slug: string }>).map((r) => r.slug));
    },
  });

  return {
    slugs: query.data ?? null,
    isLoading: query.isLoading,
  };
}
