/**
 * Active owner principles at their declared current versions, readable by any
 * signed-in player so the plan can honor the owner's linked-drill picks.
 * Server returns only owner-authored coaching content — no athlete data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PrinciplePick } from "@/lib/intelligence/principlePicks";

export function usePrinciplePicks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-principle-picks"],
    enabled: !!user,
    staleTime: 300_000,
    queryFn: async (): Promise<PrinciplePick[]> => {
      const { data, error } = await supabase.rpc("active_principle_picks");
      if (error) throw error;
      return (data ?? []) as PrinciplePick[];
    },
  });
}
