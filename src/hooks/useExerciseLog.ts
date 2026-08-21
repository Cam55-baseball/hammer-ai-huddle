import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canonicalMetricMap, deriveSideMetrics } from "@/lib/hammer/logging/metricNormalizer";

export interface ExerciseLogPayload {
  prescription_id: string;
  plan_date: string;
  movement_slug: string;
  rounds: Record<string, number | string | null>[];
  rpe?: number | null;
  bar_feel?: string | null;
  notes?: string | null;
  ai_readback?: string | null;
  template_id?: string | null;
  field_schema?: Array<{ key: string; label: string; unit?: string; kind: string }> | null;
}

/** Latest log for prefill / edit-in-place. */
export function useLatestExerciseLog(prescriptionId: string, movementSlug: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise-log", user?.id, prescriptionId],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("wk_session_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("prescription_id", prescriptionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!prescriptionId,
    staleTime: 30_000,
  });
}

/** Most-recent completed log for the same movement (for suggested load). */
export function usePreviousMovementLog(movementSlug: string, excludePrescriptionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise-log-prev", user?.id, movementSlug],
    queryFn: async () => {
      if (!user) return null;
      let q = (supabase as any)
        .from("wk_session_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("movement_slug", movementSlug)
        .order("plan_date", { ascending: false })
        .limit(1);
      if (excludePrescriptionId) q = q.neq("prescription_id", excludePrescriptionId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!movementSlug,
    staleTime: 60_000,
  });
}

export function useSaveExerciseLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ExerciseLogPayload) => {
      if (!user) throw new Error("Not signed in");
      // Derive canonical wk_session_logs columns from rounds.
      const setsCompleted = p.rounds.length;
      const repsCompleted = p.rounds
        .map((r) => (r.reps ?? r.throws ?? r.contacts ?? null))
        .filter((v): v is number => typeof v === "number");
      const loadUsed = (() => {
        const weights = p.rounds.map((r) => r.weight).filter((v): v is number => typeof v === "number");
        return weights.length ? Math.max(...weights) : null;
      })();
      const totalReps = repsCompleted.reduce((a, b) => a + b, 0) || null;
      const durationTotal = p.rounds
        .map((r) => r.duration ?? r.time ?? null)
        .filter((v): v is number => typeof v === "number")
        .reduce((a, b) => a + b, 0) || null;
      const distanceMax = (() => {
        const d = p.rounds.map((r) => r.distance).filter((v): v is number => typeof v === "number");
        return d.length ? Math.max(...d) : null;
      })();

      const row = {
        user_id: user.id,
        prescription_id: p.prescription_id,
        plan_date: p.plan_date,
        movement_slug: p.movement_slug,
        sets_completed: setsCompleted,
        reps_completed: repsCompleted.length ? repsCompleted : null,
        load_used: loadUsed,
        duration_seconds_completed: durationTotal,
        distance_feet_completed: distanceMax,
        total_reps_completed: totalReps,
        rpe: p.rpe ?? null,
        bar_feel: p.bar_feel ?? null,
        notes: p.notes ?? null,
        ai_readback: p.ai_readback ?? null,
        metrics: {
          rounds: p.rounds,
          template_id: p.template_id ?? null,
          field_schema: p.field_schema ?? null,
          // Canonical top-level metrics (bat_speed_mph, sprint_time_s,
          // throw_velo_mph, …) so the progression engine can read a personal
          // best without knowing anything about template field naming.
          ...canonicalMetricMap(p.template_id ?? null, p.rounds),
          // Per-limb decomposition for unilateral work. Null when no round
          // carried a side — never imputed.
          per_side: deriveSideMetrics(p.template_id ?? null, p.rounds),
        },


      };

      // Upsert-style: delete the previous log for this prescription, then insert.
      // Keeps history clean and avoids surface-level duplicate logs per card.
      await (supabase as any)
        .from("wk_session_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("prescription_id", p.prescription_id);

      const { data, error } = await (supabase as any)
        .from("wk_session_logs")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["exercise-log", user?.id, vars.prescription_id] });
      qc.invalidateQueries({ queryKey: ["exercise-log-prev", user?.id, vars.movement_slug] });
    },
  });
}

export async function fetchAiReadback(input: {
  movementName: string;
  dosageText: string;
  rounds: Record<string, number | string | null>[];
  rpe: number | null;
  notes: string | null;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("exercise-log-coach", { body: input });
    if (error) return null;
    return (data as any)?.readback ?? null;
  } catch {
    return null;
  }
}
