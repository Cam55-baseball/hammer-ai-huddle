import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BYS_SETTING_KEY } from "@/lib/hammer/beforeYouStartImportance";

/** Owner's importance map for "Before you start" (any signed-in reader; owner writes). */
export function useBysImportance() {
  return useQuery({
    queryKey: ["app-setting", BYS_SETTING_KEY],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("setting_value").eq("setting_key", BYS_SETTING_KEY).maybeSingle();
      if (error) throw error;
      return (data?.setting_value ?? null) as Record<string, unknown> | null;
    },
  });
}
