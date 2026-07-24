/**
 * useVaultQuizzesForDate — focused fetcher/saver for `vault_focus_quizzes`
 * used by the Hammers Today check-in cards. Avoids pulling the full
 * `useVault` surface for a small daily-plan concern.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mergeHpiLifestyle, type StressLevel } from "@/lib/hpi/lifestyleStore";

export type VaultQuizType = "morning" | "pre_lift" | "night";

export interface VaultQuizRow {
  id: string;
  user_id: string;
  entry_date: string;
  quiz_type: VaultQuizType;
  [k: string]: unknown;
}

export function useVaultQuizzesForDate(date?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const entryDate = date ?? format(new Date(), "yyyy-MM-dd");
  const queryKey = ["vault-focus-quizzes", user?.id, entryDate];

  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_focus_quizzes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("entry_date", entryDate);
      if (error) throw error;
      return ((data ?? []) as unknown as VaultQuizRow[]);
    },
    staleTime: 30_000,
  });

  const hasCompleted = useCallback(
    (t: VaultQuizType) => (query.data ?? []).some((q) => q.quiz_type === t),
    [query.data],
  );

  const saveMut = useMutation({
    mutationFn: async ({
      quizType,
      data,
    }: {
      quizType: VaultQuizType;
      data: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("Not signed in");

      let sleepTime: string | undefined;
      let wakeTime: string | undefined;
      if (quizType === "night") {
        const d = new Date();
        d.setHours(d.getHours() + 1);
        sleepTime = d.toISOString();
      } else if (quizType === "morning") {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 15);
        wakeTime = d.toISOString();
      }

      const { error } = await supabase
        .from("vault_focus_quizzes")
        .upsert(
          {
            user_id: user.id,
            entry_date: entryDate,
            quiz_type: quizType,
            sleep_time: sleepTime,
            wake_time: wakeTime,
            ...data,
          } as any,
          { onConflict: "user_id,entry_date,quiz_type" },
        );
      if (error) throw error;

      // Bridge into HPI lifestyle store (matches useVault behavior)
      try {
        const patch: Partial<{ sleepActualHours: number; stressLevel: StressLevel }> = {};
        const hs = (data as any).hours_slept;
        const sl = (data as any).stress_level;
        if (typeof hs === "number" && hs > 0) {
          patch.sleepActualHours = Math.max(4, Math.min(11, hs));
        }
        if (typeof sl === "number" && sl >= 1 && sl <= 5) {
          patch.stressLevel = Math.round(sl) as StressLevel;
        }
        if (Object.keys(patch).length > 0) mergeHpiLifestyle(patch);
      } catch {
        /* HPI sync best-effort */
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const saveFocusQuiz = useCallback(
    async (quizType: VaultQuizType, data: Record<string, unknown>) => {
      try {
        await saveMut.mutateAsync({ quizType, data });
        return { success: true as const };
      } catch (e) {
        return {
          success: false as const,
          error: e instanceof Error ? e.message : "Failed to save",
        };
      }
    },
    [saveMut],
  );

  return {
    quizzes: query.data ?? [],
    isLoading: query.isLoading,
    hasCompleted,
    saveFocusQuiz,
    entryDate,
  };
}
