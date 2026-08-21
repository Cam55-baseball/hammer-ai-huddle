/**
 * useStandards — reads everything the standards evaluator needs (logged sets,
 * bodyweight, chronological age, training age) and returns the athlete's live
 * progress across every weight-room standard, plus the awards already banked.
 *
 * Read-only with respect to prescriptions: nothing here can change a dose.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { classifyTrainingAge } from "@/lib/wic/trainingAge";
import {
  buildBestIndex,
  evaluateAll,
  toLoggedSet,
  type AthleteMeasures,
  type BestIndex,
  type StandardProgress,
} from "@/lib/hammer/standards/evaluate";
import type { StandardDef, StandardTier } from "@/lib/hammer/standards/catalog";

export interface StandardAward {
  id: string;
  standard_id: string;
  family: string;
  tier: StandardTier;
  value_achieved: number | null;
  target_value: number | null;
  unit: string | null;
  movement_slug: string | null;
  bodyweight_lbs: number | null;
  plan_date: string | null;
  created_at: string;
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  return (
    today.getFullYear() -
    d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
  );
}

/** Bodyweight, chronological age and training-age class for the signed-in athlete. */
export function useAthleteMeasures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["standards-measures", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AthleteMeasures> => {
      const [weightRes, ctxRes, physioRes] = await Promise.all([
        supabase
          .from("weight_entries")
          .select("weight_lbs, entry_date")
          .eq("user_id", user!.id)
          .order("entry_date", { ascending: false })
          .limit(1),
        (supabase.from("athlete_context") as any)
          .select("anthropometrics, lifting_age_years, competition_age_group")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("physio_health_profiles")
          .select("date_of_birth")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      const anthro = (ctxRes.data?.anthropometrics ?? {}) as Record<string, unknown>;
      const ctxWeight =
        typeof anthro.weight_lb === "number"
          ? anthro.weight_lb
          : typeof anthro.weight_lbs === "number"
            ? (anthro.weight_lbs as number)
            : null;

      return {
        bodyweightLbs: weightRes.data?.[0]?.weight_lbs ?? ctxWeight ?? null,
        chronologicalAge: ageFromDob(physioRes.data?.date_of_birth),
        trainingAge: classifyTrainingAge({
          yearsLifting: Number(ctxRes.data?.lifting_age_years ?? 0),
          isProProspect: false,
        }),
      };
    },
  });
}

/** All logged sets, folded into a best-value index. */
export function useLoggedBestIndex() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["standards-logs", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<BestIndex> => {
      const { data, error } = await (supabase as any)
        .from("wk_session_logs")
        .select("movement_slug, plan_date, metrics, load_used, reps_completed, distance_feet_completed, duration_seconds_completed")
        .eq("user_id", user!.id)
        .order("plan_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return buildBestIndex((data ?? []).map(toLoggedSet));
    },
  });
}

export function useStandardAwards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["standard-awards", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<StandardAward[]> => {
      const { data, error } = await (supabase as any)
        .from("wk_standard_awards")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StandardAward[];
    },
  });
}

/** Bank a newly-earned tier. Idempotent via the (user, standard, tier) unique key. */
export function useRecordAward() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      def: StandardDef;
      tier: StandardTier;
      value: number;
      bodyweightLbs: number | null;
      movementSlug?: string | null;
      planDate?: string | null;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await (supabase as any).from("wk_standard_awards").upsert(
        {
          user_id: user.id,
          standard_id: input.def.id,
          family: input.def.family,
          tier: input.tier,
          value_achieved: input.value,
          target_value: input.def.targets[input.tier],
          unit: input.def.unit,
          movement_slug: input.movementSlug ?? null,
          bodyweight_lbs: input.bodyweightLbs,
          plan_date: input.planDate ?? new Date().toISOString().slice(0, 10),
          evidence: { metric: input.def.metric, reps: input.def.reps ?? null },
        },
        { onConflict: "user_id,standard_id,tier", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["standard-awards", user?.id] });
    },
  });
}

export function useStandards() {
  const measures = useAthleteMeasures();
  const index = useLoggedBestIndex();
  const awards = useStandardAwards();

  const progress: StandardProgress[] = useMemo(() => {
    if (!index.data || !measures.data) return [];
    return evaluateAll(index.data, measures.data);
  }, [index.data, measures.data]);

  return {
    progress,
    measures: measures.data ?? null,
    index: index.data ?? null,
    awards: awards.data ?? [],
    isLoading: measures.isLoading || index.isLoading || awards.isLoading,
  };
}
