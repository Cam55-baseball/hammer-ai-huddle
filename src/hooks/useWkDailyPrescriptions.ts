/**
 * useWkDailyPrescriptions — fetch + lazy-generate today's elite Lift/Speed plan.
 *
 * Reads from `wk_prescriptions`. If the user has no rows for `planDate`, it
 * invokes the `wk-generate-daily` edge function to produce them, then refetches.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSideContext } from "@/contexts/SideContext";
import { toast } from "sonner";

export type WkSlot = "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental";

export interface WkRx {
  id: string;
  plan_date: string;
  slot: WkSlot;
  sequence_order: number;
  movement_slug: string;
  movement_name: string;
  phase: string;
  sets: number | null;
  reps: number | null;
  tempo: string | null;
  load_pct: number | null;
  cns_cost: number;
  cns_clamped: boolean;
  substituted_from_slug: string | null;
  substitution_reason: string | null;
  why_payload: {
    phase?: string;
    phase_display?: string;
    why?: string;
    cue?: string;
    rep_rule?: string;
    sequencing_hint?: string;
    reductions?: { reason: string; detail: string }[];
    training_age_years?: number;
    is_pro_prospect?: boolean;
  };
  status: "planned" | "completed" | "skipped";
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useWkDailyPrescriptions(planDate: string = todayStr()) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const query = useQuery({
    queryKey: ["wk-rx", user?.id, planDate],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_prescriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("plan_date", planDate)
        .order("sequence_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WkRx[];
    },
    staleTime: 60_000,
  });

  const generate = useCallback(async () => {
    if (!user?.id || generating) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("wk-generate-daily", {
        body: { plan_date: planDate },
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["wk-rx", user.id, planDate] });
    } catch (e) {
      console.error("wk-generate-daily failed", e);
      toast.error("Could not generate today's elite plan. Try again.");
    } finally {
      setGenerating(false);
    }
  }, [user?.id, planDate, qc, generating]);

  // Auto-generate once on first empty fetch.
  useEffect(() => {
    if (!query.isLoading && query.data && query.data.length === 0 && !generating) {
      generate();
    }
  }, [query.isLoading, query.data, generate, generating]);

  const grouped = useMemo(() => {
    const rxs = query.data ?? [];
    return {
      lift: rxs.filter((r) => r.slot === "lift"),
      supplemental: rxs.filter((r) => r.slot === "supplemental"),
      speed: rxs.filter((r) => r.slot === "speed"),
      bat_speed: rxs.filter((r) => r.slot === "bat_speed"),
      conditioning: rxs.filter((r) => r.slot === "conditioning"),
      cross_sport: rxs.filter((r) => r.slot === "cross_sport"),
    };
  }, [query.data]);

  const reductions = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.reductions ?? [];
  }, [query.data]);

  const phaseDisplay = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.phase_display ?? null;
  }, [query.data]);

  return {
    ...query,
    grouped,
    reductions,
    phaseDisplay,
    generate,
    generating,
  };
}
