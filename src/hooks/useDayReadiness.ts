import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRunningReadiness } from "@/hooks/useRunningReadiness";
import { loadRecoveryInputs } from "../../supabase/functions/_shared/readiness/recoveryInputsData";
import {
  recoveryAdjustment, applyRecoveryAdjustment, type RecoveryAdjustment,
} from "../../supabase/functions/_shared/readiness/recoveryAdjust";
import type { RunningReadiness } from "../../supabase/functions/_shared/readiness/runningReadiness";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface DayReadiness {
  running: RunningReadiness | null;   // the 14-day running readiness (unchanged)
  day: RunningReadiness | null;       // with today's recovery adjustment
  adjustment: RecoveryAdjustment | null;
}

/**
 * Release A2: today's readiness = the running 14-day readiness plus the recovery inputs
 * (stress, mental load, Apple Health) behind their own switches. The adjustment is shown to
 * the player only; it never changes the plan's throw, sprint or lift limits.
 * A failed read of the recovery inputs keeps the running readiness unchanged.
 */
export function useDayReadiness(today: string = iso(new Date())) {
  const { user } = useAuth();
  const running = useRunningReadiness(today);
  const recovery = useQuery<RecoveryAdjustment | null>({
    queryKey: ["day-recovery", user?.id, today],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const loaded = await loadRecoveryInputs(supabase as any, user!.id, today);
      if (!loaded) return null;
      return recoveryAdjustment(loaded.inputs, loaded.flags, loaded.thresholds);
    },
  });
  const r = running.data;
  const data: DayReadiness | null | undefined = r === undefined ? undefined
    : { running: r, adjustment: recovery.data ?? null, day: applyRecoveryAdjustment(r, recovery.data ?? { delta: 0, chosen: null, effects: [], unknown: [] }) };
  return { data, isError: running.isError, isLoading: running.isLoading || recovery.isLoading };
}
