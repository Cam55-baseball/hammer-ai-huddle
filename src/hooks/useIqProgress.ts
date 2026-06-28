import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { nextReview, gradeFromAttempt } from "@/lib/iq/spacedRepetition";
import type { IqUserProgress } from "@/lib/iq/types";

export function useIqProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["iq-progress", user?.id],
    queryFn: async () => {
      if (!user) return [] as IqUserProgress[];
      const { data, error } = await supabase
        .from("iq_user_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as unknown as IqUserProgress[];
    },
    enabled: !!user,
  });
}

export function useRecordIqAttempt() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      scenarioId: string;
      situationId: string;
      positionChosen: string | null;
      correct: boolean;
      answerPayload: Record<string, unknown>;
      timeMs: number;
    }) => {
      if (!user) throw new Error("Not signed in");

      // 1) Append attempt
      const { error: aErr } = await supabase.from("iq_user_attempts").insert({
        user_id: user.id,
        scenario_id: input.scenarioId,
        situation_id: input.situationId,
        position_chosen: input.positionChosen,
        correct: input.correct,
        answer_payload: input.answerPayload,
        time_ms: input.timeMs,
      });
      if (aErr) throw aErr;

      // 2) Upsert progress with SM-2 update
      const { data: existing } = await supabase
        .from("iq_user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("situation_id", input.situationId)
        .maybeSingle();

      const prev = (existing ?? {
        ef_factor: 2.5,
        interval_days: 0,
        mastery_score: 0,
        streak: 0,
        lifetime_attempts: 0,
        lifetime_correct: 0,
      }) as IqUserProgress;

      const grade = gradeFromAttempt(input.correct, input.timeMs);
      const sr = nextReview(prev, grade);

      const payload = {
        user_id: user.id,
        situation_id: input.situationId,
        mastery_score: sr.mastery_score,
        ef_factor: sr.ef_factor,
        interval_days: sr.interval_days,
        next_due_at: sr.next_due_at,
        streak: sr.streak,
        last_seen_at: new Date().toISOString(),
        lifetime_attempts: (prev.lifetime_attempts ?? 0) + 1,
        lifetime_correct: (prev.lifetime_correct ?? 0) + (input.correct ? 1 : 0),
      };

      const { error: upErr } = await supabase
        .from("iq_user_progress")
        .upsert(payload, { onConflict: "user_id,situation_id" });
      if (upErr) throw upErr;

      return sr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["iq-progress"] });
    },
  });
}
