import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../supabase/functions/_shared/wic/flags/featureSwitches";
import { useQuery } from "@tanstack/react-query";
import { assessmentStartAllowed } from "@/lib/assessment/startGate";
import { startMissing, type StartMissingItem } from "../../supabase/functions/_shared/startReadiness";

/**
 * Once-per-account "Start Hammers Today Plan" state.
 * The start date lives on the profile (same on every device). The gate only
 * applies while the `hammers_today_start_gate` switch is on for this person.
 */
export function useHammersTodayStart() {
  const { user } = useAuth();
  // Starting is once per account and never undone, so a start this device has
  // already seen is shown at once on reload (no loading box before the plan);
  // the server answer still arrives and wins.
  const cacheKey = user?.id ? `hm.htstart.${user.id}` : null;
  const readCache = (k: string | null) => { try { return k ? localStorage.getItem(k) : null; } catch { return null; } };
  const [loading, setLoading] = useState(() => !readCache(cacheKey));
  const [gateOn, setGateOn] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(() => readCache(cacheKey));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assessment = useQuery({
    queryKey: ["assessment-start", user?.id], enabled: !!user?.id && !startedAt,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("initial_assessments").select("completed_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data?.completed_at ?? null;
    },
  });
  const details = useQuery({
    queryKey: ["start-readiness", user?.id, !!assessment.data], enabled: !!user?.id && !startedAt, staleTime: 5_000,
    queryFn: async (): Promise<StartMissingItem[]> => {
      if (!user) throw new Error("Sign in before checking plan details.");
      const uid = user.id;
      const [p, c, m, e] = await Promise.all([
        supabase.from("profiles").select("date_of_birth").eq("id", uid).maybeSingle(),
        supabase.from("athlete_context").select("sport_primary, position_primary, competition_level, category_goals, goal_summary, goal_priority_rank, weekly_availability_days").eq("user_id", uid).maybeSingle(),
        supabase.from("athlete_mpi_settings").select("sport, season_status").eq("user_id", uid),
        supabase.from("athlete_equipment_context").select("equipment").eq("user_id", uid).eq("scope", "persistent").maybeSingle(),
      ]);
      for (const r of [p, c, m, e]) if (r.error) throw r.error;
      const ctx = (c.data ?? {}) as Record<string, any>;
      const mpi = ((m.data ?? []) as Array<{ sport: string | null; season_status: string | null }>);
      const season = (mpi.find((r) => r.sport === ctx.sport_primary) ?? mpi[0])?.season_status ?? null;
      const eq = (e.data as { equipment?: unknown } | null)?.equipment;
      return startMissing({
        ...ctx, date_of_birth: (p.data as any)?.date_of_birth ?? null, season_status: season,
        equipment_saved: Array.isArray(eq) && eq.length > 0,
        assessment_completed: !!assessment.data,
      });
    },
  });
  const missing = details.data ?? [];
  const assessmentReady = assessmentStartAllowed(startedAt, assessment.data ?? null) && details.isSuccess && missing.length === 0;

  useEffect(() => {
    let alive = true;
    if (!user?.id) return;
    const cached = readCache(`hm.htstart.${user.id}`);
    if (cached) { setStartedAt(cached); setLoading(false); }
    (async () => {
      const [{ data: sw }, { data: prof }] = await Promise.all([
        supabase.from("wk_feature_switches" as any)
          .select("feature_key, mode, allowlist, updated_by")
          .eq("feature_key", "hammers_today_start_gate").maybeSingle(),
        supabase.from("profiles").select("hammers_today_started_at" as any).eq("id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setGateOn(isSwitchOnFor(sw as any, user.id));
      const at = ((prof as any)?.hammers_today_started_at as string | null) ?? null;
      setStartedAt(at);
      try { if (at) localStorage.setItem(`hm.htstart.${user.id}`, at); else localStorage.removeItem(`hm.htstart.${user.id}`); } catch { /* storage blocked */ }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const start = useCallback(async () => {
    if (starting || startedAt) return;
    if (!assessmentReady) { setError("Finish the missing details below first."); return; }
    setStarting(true);
    setError(null);
    const { data, error: rpcErr } = await (supabase as any).rpc("start_hammers_today");
    setStarting(false);
    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      setError(msg.startsWith("Missing:") ? `Still missing — ${msg.slice(8).trim()}` : "Couldn't start your plan. Check your connection and tap again.");
      return;
    }
    const at = String(data ?? new Date().toISOString());
    setStartedAt(at);
    try { if (user?.id) localStorage.setItem(`hm.htstart.${user.id}`, at); } catch { /* storage blocked */ }
  }, [starting, startedAt, user?.id, assessmentReady]);

  return { loading, gateOn, startedAt, needsStart: gateOn && !startedAt, start, starting, error, assessmentReady, missing, missingLoading: details.isLoading, missingError: details.isError };
}
