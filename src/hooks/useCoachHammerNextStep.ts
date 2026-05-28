/**
 * useCoachHammerNextStep — calls the coach-hammer-next-step edge function
 * with a compact, replay-safe athlete snapshot derived from already-fetched
 * dashboard data. Cached per snapshot hash for 10 minutes.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useEscalationFeed } from "@/hooks/command/useEscalationFeed";
import { useDayState } from "@/hooks/useDayState";
import { useMPIScores } from "@/hooks/useMPIScores";
import {
  latestByTopicPrefix,
  projectLatest,
  windowCount,
} from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type CoachHammerTier =
  | "survivability"
  | "recovery"
  | "readiness-low"
  | "consistency"
  | "performance"
  | "optimization"
  | "missing";

export interface CoachHammerStep {
  tier: CoachHammerTier;
  tierLabel: string;
  title: string;
  analysis: string;
  instruction: string;
  why: string;
  ctaLabel: string;
  ctaRoute: string;
}

function scoreOf(ev: AsbEventRow | null): number | null {
  if (!ev) return null;
  const p = projectLatest<Record<string, unknown>>(ev);
  const v = p.value as any;
  const s = v?.score ?? v?.value ?? null;
  return typeof s === "number" ? s : null;
}

function staleHoursOf(ev: AsbEventRow | null): number | null {
  if (!ev?.occurred_at) return null;
  const t = Date.parse(ev.occurred_at);
  if (Number.isNaN(t)) return null;
  return Math.round((Date.now() - t) / 3_600_000);
}

export function useCoachHammerNextStep() {
  const { user } = useAuth();
  const { data: rows, isLoading: rowsLoading } = useAthleteCommandRows({
    days: 30,
    limit: 500,
  });
  const { unackedCount } = useEscalationFeed({ withinHours: 72 });
  const { dayType } = useDayState();
  const { data: mpi } = useMPIScores();

  const snapshot = useMemo(() => {
    if (!rows) return null;
    const readinessEv = latestByTopicPrefix(rows, "behavioral.readiness");
    const fatigueEv = latestByTopicPrefix(rows, "behavioral.fatigue");
    const recoveryEv =
      latestByTopicPrefix(rows, "behavioral.recovery") ??
      latestByTopicPrefix(rows, "foundation.recovery");

    const sessions = windowCount(rows, "athlete.session", 7);
    const checkIns = windowCount(rows, "behavioral.checkin", 7);
    const recoverySessions = windowCount(rows, "behavioral.recovery", 7);

    return {
      hour: new Date().getHours(),
      dayType: dayType ?? null,
      escalationCount: unackedCount ?? 0,
      readiness: {
        score: scoreOf(readinessEv),
        staleHours: staleHoursOf(readinessEv),
      },
      fatigue: {
        score: scoreOf(fatigueEv),
        staleHours: staleHoursOf(fatigueEv),
      },
      recovery: {
        score: scoreOf(recoveryEv),
        staleHours: staleHoursOf(recoveryEv),
      },
      mpi: {
        score: mpi?.adjusted_global_score ?? null,
        trend: (mpi as any)?.trend_direction ?? null,
      },
      recentActivity: {
        sessionsLast7Days: sessions.count,
        checkInsLast7Days: checkIns.count,
        recoveryLast7Days: recoverySessions.count,
      },
    };
  }, [rows, unackedCount, dayType, mpi]);

  // Bucket the hour to 30-min windows so the cache key doesn't churn every render
  const hashKey = useMemo(() => {
    if (!snapshot) return null;
    const halfHour = Math.floor(Date.now() / (30 * 60 * 1000));
    return JSON.stringify({ ...snapshot, halfHour });
  }, [snapshot]);

  const query = useQuery({
    queryKey: ["coach-hammer-next-step", user?.id, hashKey],
    enabled: !!user && !!snapshot,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<CoachHammerStep> => {
      const { data, error } = await supabase.functions.invoke(
        "coach-hammer-next-step",
        { body: { snapshot } },
      );
      if (error) throw error;
      if (!data?.step) throw new Error("malformed_response");
      return data.step as CoachHammerStep;
    },
  });

  return {
    step: query.data ?? null,
    isLoading: rowsLoading || query.isLoading,
    error: query.error as Error | null,
  };
}
