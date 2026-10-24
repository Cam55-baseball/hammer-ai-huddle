/**
 * useCoachPrescriptions — the player's inbox of coach-sent prescriptions
 * (owner request Oct 24). Lists pending prescriptions for a plan date and
 * applies the player's choice through the coach-rx-safety function, which
 * re-checks safety server-side before any "Use instead" replaces a card.
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CoachRxCategory =
  | "hitting" | "pitching" | "throwing" | "fielding" | "baserunning"
  | "lift" | "speed" | "conditioning" | "warmup" | "mobility" | "recovery" | "vision";

export type CoachRxStatus = "pending" | "used_instead" | "added_alongside" | "saved_for_later" | "declined";

export interface CoachPrescription {
  id: string;
  sender_id: string;
  recipient_id: string;
  category: CoachRxCategory;
  plan_date: string;
  title: string;
  exercises: Array<Record<string, unknown>>;
  gear_labels: string[];
  source_template_id: string | null;
  team_send_id: string | null;
  status: CoachRxStatus;
  safety_result: { verdict?: string; reasons?: string[]; safeOption?: string } | null;
  created_at: string;
}

export type CoachRxChoice = "use_instead" | "add_alongside" | "save_for_later" | "declined";

export interface ChooseResult {
  applied: boolean;
  verdict?: string | null;
  reasons?: string[];
  safeOption?: string | null;
  replaced?: number;
}

export function useCoachPrescriptions(planDate: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["coach-rx-inbox", user?.id, planDate];

  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_prescriptions" as any)
        .select("*")
        .eq("recipient_id", user!.id)
        .eq("plan_date", planDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CoachPrescription[];
    },
    staleTime: 30_000,
  });

  const chooseMut = useMutation({
    mutationFn: async ({ id, choice }: { id: string; choice: CoachRxChoice }): Promise<ChooseResult> => {
      const { data, error } = await supabase.functions.invoke("coach-rx-safety", {
        body: { mode: "choose", prescription_id: id, choice },
      });
      if (error) throw new Error(error.message || "Could not save your choice");
      return data as ChooseResult;
    },
    onSuccess: (r, vars) => {
      if (!r.applied && r.reasons?.length) {
        toast.error(r.reasons[0]);
      } else if (vars.choice === "use_instead") {
        toast.success("Coach workout is now today's plan for that card.");
      } else if (vars.choice === "add_alongside") {
        toast.success("Added alongside your plan.");
      } else if (vars.choice === "save_for_later") {
        toast.success("Saved for later.");
      }
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["wk-rx"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your choice"),
  });

  const choose = useCallback(
    (id: string, choice: CoachRxChoice) => chooseMut.mutateAsync({ id, choice }),
    [chooseMut],
  );

  return {
    prescriptions: query.data ?? [],
    pending: (query.data ?? []).filter((p) => p.status === "pending"),
    isLoading: query.isLoading,
    choose,
    choosing: chooseMut.isPending,
  };
}

/** Coach-side: list everything the coach has sent, with per-player status. */
export function useSentCoachPrescriptions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-rx-sent", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_prescriptions" as any)
        .select("*")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CoachPrescription[];
    },
    staleTime: 30_000,
  });
}
