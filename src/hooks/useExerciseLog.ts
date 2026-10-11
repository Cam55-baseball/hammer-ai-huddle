import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type { ExerciseLogPayload } from "@/lib/logging/writeExerciseLog";
import type { ExerciseLogPayload } from "@/lib/logging/writeExerciseLog";
import { buildExerciseLogRow } from "@/lib/logging/writeExerciseLog";

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
      const row = buildExerciseLogRow(user.id, p);

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
      // Step 30 E — a logged pitch count updates the one arm ledger immediately.
      qc.invalidateQueries({ queryKey: ["recent-pitching-load"] });
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
