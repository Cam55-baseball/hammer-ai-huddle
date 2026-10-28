/**
 * Hammer Athlete Context — canonical envelope projection.
 *
 * Sprint: Athlete Context Spine Implementation (P0-1).
 *
 * Reads the canonical `get_athlete_context_envelope(user_id)` RPC plus
 * existing live signals (HIE, MPI, day-state, command rows) and projects a
 * uniform `{ value, source, confidence, missing, lastUpdated, lineage }`
 * envelope for every consumer (Coach Hammer, dailyPlan, workouts, speed,
 * roadmap, recommendations).
 *
 * Pure read layer — does not author organism truth. Missingness is preserved,
 * never imputed. Phase 60–61 confidence / missingness continuity applies.
 */
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { useDayState } from "@/hooks/useDayState";
import { useMPIScores } from "@/hooks/useMPIScores";
import { useRunningReadiness } from "@/hooks/useRunningReadiness";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EQUIPMENT_CONTEXT_CHANGED_EVENT } from "@/lib/hammer/context/equipment";
import {
  fetchAthleteContextEnvelope,
  type AthleteContextEnvelope,
} from "@/lib/hammer/context/envelope";
import {
  latestByTopicPrefix,
  projectLatest,
} from "@/lib/command/projections";

import { spineVariables } from "./contextProjection";
import type { ContextVariable, HammerAthleteContext } from "./contextProjection";
export { spineVariables, contextFromEnvelope } from "./contextProjection";
export type { ContextConfidence, ContextLineage, ContextVariable, HammerAthleteContext } from "./contextProjection";

function mkLive<T>(
  key: string,
  label: string,
  domain: ContextVariable["domain"],
  value: T | null | undefined,
  source: string,
  lastUpdated: string | null = null,
): ContextVariable<T> {
  const missing = value === null || value === undefined || value === "";
  return {
    key,
    label,
    domain,
    value: missing ? null : (value as T),
    source,
    confidence: missing ? "missing" : "high",
    missing,
    lastUpdated,
    lineage: { owner: "system", source, rawConfidence: missing ? "missing" : "high" },
  };
}

export function useHammerAthleteContext(): HammerAthleteContext {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { snapshot } = useHIESnapshot();
  const { data: rows } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { dayType } = useDayState();
  const { data: mpi } = useMPIScores();
  // Owner Oct 28: the plan reads RUNNING readiness (14-day history); latest check-in only when history is too thin.
  const { data: running } = useRunningReadiness();

  const { data: envelope, isLoading: envLoading } = useQuery({
    queryKey: ["hammer-context-envelope", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    // Returning to Today's Plan must never reuse an envelope from before an
    // equipment/profile edit, even when that edit happened on another screen.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: () => fetchAthleteContextEnvelope(user!.id),
  });

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ["hammer-context-envelope", user.id],
        exact: true,
        refetchType: "active",
      });
    };
    window.addEventListener(EQUIPMENT_CONTEXT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(EQUIPMENT_CONTEXT_CHANGED_EVENT, refresh);
  }, [queryClient, user?.id]);

  return useMemo<HammerAthleteContext>(() => {
    const env = envelope ?? null;
    const readinessEv = rows ? latestByTopicPrefix(rows, "behavioral.readiness") : null;
    const sleepEv = rows ? latestByTopicPrefix(rows, "behavioral.sleep") : null;
    const planEv = rows ? latestByTopicPrefix(rows, "athlete.plan.today") : null;
    const planP = planEv
      ? (projectLatest<Record<string, unknown>>(planEv).value as Record<string, unknown> | null)
      : null;

    const vars: ContextVariable[] = [
      // Spine variables (envelope) — shared with contextFromEnvelope() so tests
      // exercise the same derivation the app uses.
      ...spineVariables(env),

      // Live signals (existing)

      mkLive("season_phase_runtime", "Season phase (runtime)", "season", dayType ?? null, "useDayState.dayType"),
      mkLive(
        "readiness",
        "Readiness",
        "physiology",
        running?.score != null
          ? { score: running.score, band: running.band, source: "running_14d", painFlag: running.painFlag }
          : readinessEv ? projectLatest(readinessEv).value : null,
        running?.score != null ? "runningReadiness:14d" : "asb:behavioral.readiness",
        readinessEv?.occurred_at ?? null,
      ),
      mkLive(
        "sleep",
        "Sleep",
        "physiology",
        sleepEv ? projectLatest(sleepEv).value : null,
        "asb:behavioral.sleep",
        sleepEv?.occurred_at ?? null,
      ),
      mkLive(
        "mpi",
        "MPI",
        "development",
        mpi?.adjusted_global_score ?? null,
        "mpi_scores.adjusted_global_score",
      ),
      mkLive(
        "plan_today",
        "Today's plan",
        "plan",
        planP,
        "asb:athlete.plan.today",
        planEv?.occurred_at ?? null,
      ),
      mkLive(
        "hie_snapshot",
        "Weakness focus",
        "development",
        snapshot?.prescriptive_actions?.[0]?.weakness_area ?? null,
        "hie_snapshots",
      ),
    ];

    const missing = vars.filter((v) => v.missing);
    return {
      variables: vars,
      missing,
      missingCount: missing.length,
      isLoading: envLoading,
      envelope: env,
      get<T>(key: string) {
        return vars.find((v) => v.key === key) as ContextVariable<T> | undefined;
      },
    };
  }, [envelope, envLoading, rows, dayType, mpi, snapshot, running]);
}
