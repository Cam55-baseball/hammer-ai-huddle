/**
 * useCoachHammerNextStep — calls the coach-hammer-next-step edge function
 * with a compact, replay-safe athlete snapshot derived from already-fetched
 * dashboard data. Cached per snapshot hash for 10 minutes.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { coarseKey } from "@/lib/hammer/coachSnapshot";
import { getTodayDate } from "@/utils/dateUtils";
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

export function useCoachHammerNextStep(options?: { enabled?: boolean }) {
  const enabledOpt = options?.enabled ?? true;

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
    const sorenessEv = latestByTopicPrefix(rows, "behavioral.soreness");
    const sleepEv = latestByTopicPrefix(rows, "behavioral.sleep");
    const stressEv = latestByTopicPrefix(rows, "behavioral.stress");
    const hydrationEv = latestByTopicPrefix(rows, "behavioral.hydration");
    const planEv = latestByTopicPrefix(rows, "athlete.plan.today");
    const checkinEv = latestByTopicPrefix(rows, "behavioral.checkin");

    const sessions = windowCount(rows, "athlete.session", 7);
    const checkIns = windowCount(rows, "behavioral.checkin", 7);

    const payloadOf = (ev: typeof readinessEv) =>
      ev ? (projectLatest<Record<string, unknown>>(ev).value as any) : null;

    const sleepP = payloadOf(sleepEv);
    const planP = payloadOf(planEv);
    const checkinP = payloadOf(checkinEv);

    return {
      hour: new Date().getHours(),
      dayType: dayType ?? null,
      escalationCount: unackedCount ?? 0,
      readiness: { score: scoreOf(readinessEv), staleHours: staleHoursOf(readinessEv) },
      fatigue: { score: scoreOf(fatigueEv), staleHours: staleHoursOf(fatigueEv) },
      soreness: {
        score: scoreOf(sorenessEv),
        regions: (payloadOf(sorenessEv)?.regions as string[] | undefined) ?? null,
        staleHours: staleHoursOf(sorenessEv),
      },
      sleep: {
        hours: typeof sleepP?.hours === "number" ? sleepP.hours : null,
        quality: typeof sleepP?.quality === "number" ? sleepP.quality : null,
        staleHours: staleHoursOf(sleepEv),
      },
      stress: { score: scoreOf(stressEv), staleHours: staleHoursOf(stressEv) },
      hydration: {
        level: (payloadOf(hydrationEv)?.level as string | undefined) ?? null,
        staleHours: staleHoursOf(hydrationEv),
      },
      plan: {
        modules: (planP?.modules as string[] | undefined) ?? null,
        liftingIntensity: (planP?.lifting_intensity as string | null) ?? null,
        volume: (planP?.volume as string | null) ?? null,
        staleHours: staleHoursOf(planEv),
      },
      checkin: {
        note: (checkinP?.note as string | undefined) ?? null,
        skipped: (checkinP?.skipped as string[] | undefined) ?? null,
        staleHours: staleHoursOf(checkinEv),
      },
      mpi: {
        score: mpi?.adjusted_global_score ?? null,
        trend: (mpi as any)?.trend_direction ?? null,
      },
      recentActivity: {
        sessionsLast7Days: sessions.count,
        checkInsLast7Days: checkIns.count,
      },
    };
  }, [rows, unackedCount, dayType, mpi]);
  // Key on the SAME coarse projection the edge function hashes (see
  // src/lib/hammer/coachSnapshot.ts). Identical coarse state on a later page
  // load reuses the query cache and never re-invokes the function.
  // One implementation of "what day is it": the client's LOCAL date. It is
  // sent to the edge function so both sides hash and cache the same day.
  const planDate = getTodayDate();
  const hashKey = useMemo(() => {
    if (!snapshot) return null;
    return coarseKey(snapshot, planDate);
  }, [snapshot, planDate]);

  const query = useQuery({
    queryKey: ["coach-hammer-next-step", user?.id, hashKey],
    enabled: enabledOpt && !!user && !!snapshot,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    queryFn: async (): Promise<CoachHammerStep> => {
      const { data, error } = await supabase.functions.invoke(
        "coach-hammer-next-step",
        { body: { snapshot, plan_date: planDate } },
      );
      if (error) throw error;
      if (!data?.step) throw new Error("malformed_response");
      return data.step as CoachHammerStep;
    },
  });

  return {
    step: query.data ?? null,
    isLoading: enabledOpt ? rowsLoading || query.isLoading : false,
    error: query.error as Error | null,
  };
}

