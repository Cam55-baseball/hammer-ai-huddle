import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useSwapV2() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["swap-v2", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("swap_v2_enabled");
      if (error) throw error;
      return data === true;
    },
    staleTime: 30_000,
  });
  return { enabled: query.data === true, loading: Boolean(user) && query.isPending };
}