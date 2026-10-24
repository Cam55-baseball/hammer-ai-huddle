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
  /** Scheduling (run 6): any_day = player picks when; date/dates/recurring are fixed days. */
  schedule_type?: "any_day" | "date" | "dates" | "recurring";
  series_id?: string | null;
  recur_weekdays?: number[] | null;
  recur_every_weeks?: number | null;
  recur_monthly_ordinal?: number | null;
  recur_monthly_weekday?: number | null;
  recur_end?: string | null;
  recur_count?: number | null;
  cancelled_at?: string | null;
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
    mutationFn: async ({ id, choice, activateToday }: { id: string; choice: CoachRxChoice; activateToday?: boolean }): Promise<ChooseResult> => {
      const { data, error } = await supabase.functions.invoke("coach-rx-safety", {
        body: { mode: "choose", prescription_id: id, choice, activate_today: activateToday === true },
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
    (id: string, choice: CoachRxChoice, activateToday?: boolean) => chooseMut.mutateAsync({ id, choice, activateToday }),
    [chooseMut],
  );

  return {
    prescriptions: query.data ?? [],
    pending: (query.data ?? []).filter((p) => p.status === "pending" && !p.cancelled_at),
    isLoading: query.isLoading,
    choose,
    choosing: chooseMut.isPending,
  };
}

/**
 * The player's "My Workouts → From my coaches" list: every coach prescription
 * regardless of date — upcoming scheduled days, any-day cards, and the
 * Saved for later shelf — with activation ("Use today") going through the
 * same server safety check as a same-day choice.
 */
export function useMyCoachWorkouts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["coach-rx-mine", user?.id];

  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_prescriptions" as any)
        .select("*")
        .eq("recipient_id", user!.id)
        .order("plan_date", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as CoachPrescription[];
    },
    staleTime: 30_000,
  });

  const activateMut = useMutation({
    mutationFn: async ({ id, choice }: { id: string; choice: CoachRxChoice }): Promise<ChooseResult> => {
      const { data, error } = await supabase.functions.invoke("coach-rx-safety", {
        body: { mode: "choose", prescription_id: id, choice, activate_today: true },
      });
      if (error) throw new Error(error.message || "Could not save your choice");
      return data as ChooseResult;
    },
    onSuccess: (r) => {
      if (!r.applied && r.reasons?.length) toast.error(r.reasons[0]);
      else toast.success("Added to today's plan.");
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["coach-rx-inbox"] });
      qc.invalidateQueries({ queryKey: ["wk-rx"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your choice"),
  });

  const all = query.data ?? [];
  const today = new Date().toLocaleDateString("en-CA");
  return {
    isLoading: query.isLoading,
    /** Unanswered cards: any-day, today, and future scheduled days. */
    fromCoaches: all.filter((p) => p.status === "pending" && !p.cancelled_at),
    /** The Saved for later shelf. */
    savedForLater: all.filter((p) => p.status === "saved_for_later" && !p.cancelled_at),
    /** Answered history (used / added / declined) for the status column. */
    answered: all.filter((p) => ["used_instead", "added_alongside", "declined"].includes(p.status)),
    today,
    activate: (id: string, choice: CoachRxChoice) => activateMut.mutateAsync({ id, choice }),
    activating: activateMut.isPending,
  };
}

/** Coach/org side: manage sent workouts — list with completion, reschedule, cancel, resend. */
export function useManageSentWorkouts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("coach-rx-safety", {
      body: { mode: "manage", ...body },
    });
    if (error) throw new Error(error.message || "Could not update the send");
    return data as any;
  }, []);

  const listQ = useQuery({
    queryKey: ["coach-rx-manage", user?.id],
    enabled: !!user?.id,
    queryFn: () => call({ action: "list" }),
    staleTime: 30_000,
  });

  const act = useMutation({
    mutationFn: (body: Record<string, unknown>) => call(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-rx-manage"] });
      qc.invalidateQueries({ queryKey: ["coach-rx-sent"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the send"),
  });

  return {
    rows: (listQ.data?.rows ?? []) as Array<Record<string, any>>,
    isLoading: listQ.isLoading,
    reschedule: (id: string, newDate: string) => act.mutateAsync({ action: "reschedule", prescription_id: id, new_date: newDate }),
    cancel: (id: string) => act.mutateAsync({ action: "cancel", prescription_id: id }),
    cancelSeries: (seriesId: string) => act.mutateAsync({ action: "cancel_series", series_id: seriesId }),
    resend: (id: string, newDate: string) => act.mutateAsync({ action: "resend", prescription_id: id, new_date: newDate }),
    acting: act.isPending,
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
