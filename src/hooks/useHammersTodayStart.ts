import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../supabase/functions/_shared/wic/flags/featureSwitches";

/**
 * Once-per-account "Start Hammers Today Plan" state.
 * The start date lives on the profile (same on every device). The gate only
 * applies while the `hammers_today_start_gate` switch is on for this person.
 */
export function useHammersTodayStart() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gateOn, setGateOn] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user?.id) return;
    (async () => {
      const [{ data: sw }, { data: prof }] = await Promise.all([
        supabase.from("wk_feature_switches" as any)
          .select("feature_key, mode, allowlist, updated_by")
          .eq("feature_key", "hammers_today_start_gate").maybeSingle(),
        supabase.from("profiles").select("hammers_today_started_at" as any).eq("id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setGateOn(isSwitchOnFor(sw as any, user.id));
      setStartedAt(((prof as any)?.hammers_today_started_at as string | null) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const start = useCallback(async () => {
    if (starting || startedAt) return;
    setStarting(true);
    setError(null);
    const { data, error: rpcErr } = await (supabase as any).rpc("start_hammers_today");
    setStarting(false);
    if (rpcErr) {
      setError("Couldn't start your plan. Check your connection and tap again.");
      return;
    }
    setStartedAt(String(data ?? new Date().toISOString()));
  }, [starting, startedAt]);

  return { loading, gateOn, startedAt, needsStart: gateOn && !startedAt, start, starting, error };
}
