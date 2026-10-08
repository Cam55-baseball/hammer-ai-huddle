import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../supabase/functions/_shared/wic/flags/featureSwitches";
import { PROGRAMS_RETIRED_KEY } from "../../supabase/functions/_shared/archive/retiredPrograms";

/**
 * Is the program-retirement switch ON for the signed-in player?
 * Starts true (programs hidden — retired 2026-10-08) and resolves once per user per
 * page load; every caller shares the same answer.
 */
const cache = new Map<string, Promise<boolean>>();

function load(userId: string): Promise<boolean> {
  let p = cache.get(userId);
  if (!p) {
    p = (async () => {
      try {
        const { data } = await supabase
          .from("wk_feature_switches" as any)
          .select("feature_key, mode, allowlist, updated_by")
          .eq("feature_key", PROGRAMS_RETIRED_KEY)
          .maybeSingle();
        // Retired 2026-10-08: only an explicit OFF row brings menus/tiles back (pages stay archived).
        if (!data) return true;
        return (data as any).mode === "off" ? false : isSwitchOnFor(data as any, userId) || (data as any).mode === "all";
      } catch {
        return true;
      }
    })();
    cache.set(userId, p);
  }
  return p;
}

export function useProgramsRetired(): { retired: boolean; ready: boolean } {
  const { user, loading } = useAuth();
  const [state, setState] = useState<{ retired: boolean; ready: boolean }>({ retired: true, ready: false });
  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user?.id) { setState({ retired: true, ready: true }); return; }
    load(user.id).then((retired) => { if (alive) setState({ retired, ready: true }); });
    return () => { alive = false; };
  }, [user?.id, loading]);
  return state;
}
