/**
 * Hammer Athlete Context — canonical inventory hook.
 *
 * Single read-only projection that every Hammer surface (next-step,
 * onboarding, daily plan, chat) uses to know:
 *   what we know · how confident we are · what is missing.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section C).
 *
 * Pure read layer — does not author organism truth. Replay-safe: every value
 * is sourced from canonical ASB projections, profile columns, or HIE snapshot.
 * Missingness is preserved, never imputed. (Megaphase 60–61 confidence /
 * missingness continuity invariants apply.)
 */
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { useDayState } from "@/hooks/useDayState";
import { useMPIScores } from "@/hooks/useMPIScores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  latestByTopicPrefix,
  projectLatest,
} from "@/lib/command/projections";

export type ContextConfidence = "high" | "medium" | "low" | "missing";

export interface ContextVariable<T = unknown> {
  readonly key: string;
  readonly label: string;
  readonly domain:
    | "identity"
    | "season"
    | "physiology"
    | "schedule"
    | "equipment"
    | "goals"
    | "injury"
    | "development"
    | "plan";
  readonly value: T | null;
  readonly source: string;
  readonly confidence: ContextConfidence;
  readonly missing: boolean;
  readonly lastUpdated: string | null;
}

export interface HammerAthleteContext {
  readonly variables: ReadonlyArray<ContextVariable>;
  readonly missing: ReadonlyArray<ContextVariable>;
  readonly isLoading: boolean;
  /** Number of variables Hammer still needs to ask about. */
  readonly missingCount: number;
  /** Look up a single variable. */
  get<T = unknown>(key: string): ContextVariable<T> | undefined;
}

function mk<T>(
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
  };
}

export function useHammerAthleteContext(): HammerAthleteContext {
  const { user } = useAuth();
  const { snapshot } = useHIESnapshot();
  const { data: rows } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { dayType } = useDayState();
  const { data: mpi } = useMPIScores();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["hammer-context-profile", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,date_of_birth,sport,position,experience_level,height_inches,weight_lbs,school_grade,training_focus,goal_summary,equipment_access,weekly_availability,lifting_age_years,injury_history,development_priorities",
        )
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? {};
    },
  });

  return useMemo<HammerAthleteContext>(() => {
    const p = (profile ?? {}) as Record<string, unknown>;
    const readinessEv = rows ? latestByTopicPrefix(rows, "behavioral.readiness") : null;
    const sleepEv = rows ? latestByTopicPrefix(rows, "behavioral.sleep") : null;
    const planEv = rows ? latestByTopicPrefix(rows, "athlete.plan.today") : null;
    const planP = planEv
      ? (projectLatest<Record<string, unknown>>(planEv).value as Record<string, unknown> | null)
      : null;

    const vars: ContextVariable[] = [
      mk("first_name", "Name", "identity", p.first_name, "profiles.first_name"),
      mk("date_of_birth", "Age", "identity", p.date_of_birth, "profiles.date_of_birth"),
      mk("sport", "Sport", "identity", p.sport, "profiles.sport"),
      mk("position", "Position", "identity", p.position, "profiles.position"),
      mk("experience_level", "Experience", "development", p.experience_level, "profiles.experience_level"),
      mk("school_grade", "School year", "identity", p.school_grade, "profiles.school_grade"),
      mk("training_focus", "Training focus", "goals", p.training_focus, "profiles.training_focus"),
      mk("goal_summary", "Primary goal", "goals", p.goal_summary, "profiles.goal_summary"),
      mk("development_priorities", "Development priorities", "development", p.development_priorities, "profiles.development_priorities"),
      mk("equipment_access", "Equipment access", "equipment", p.equipment_access, "profiles.equipment_access"),
      mk("weekly_availability", "Weekly availability", "schedule", p.weekly_availability, "profiles.weekly_availability"),
      mk("lifting_age_years", "Lifting age", "development", p.lifting_age_years, "profiles.lifting_age_years"),
      mk("injury_history", "Injury constraints", "injury", p.injury_history, "profiles.injury_history"),
      mk("season_phase", "Season phase", "season", dayType ?? null, "useDayState.dayType"),
      mk("readiness", "Readiness", "physiology", readinessEv ? projectLatest(readinessEv).value : null, "asb:behavioral.readiness", readinessEv?.occurred_at ?? null),
      mk("sleep", "Sleep", "physiology", sleepEv ? projectLatest(sleepEv).value : null, "asb:behavioral.sleep", sleepEv?.occurred_at ?? null),
      mk("mpi", "MPI", "development", mpi?.adjusted_global_score ?? null, "mpi_scores.adjusted_global_score"),
      mk("plan_today", "Today's plan", "plan", planP, "asb:athlete.plan.today", planEv?.occurred_at ?? null),
      mk("hie_snapshot", "Weakness focus", "development", snapshot?.prescriptive_actions?.[0]?.weakness_area ?? null, "hie_snapshots"),
    ];

    const missing = vars.filter((v) => v.missing);
    return {
      variables: vars,
      missing,
      missingCount: missing.length,
      isLoading: profileLoading,
      get<T>(key: string) {
        return vars.find((v) => v.key === key) as ContextVariable<T> | undefined;
      },
    };
  }, [profile, profileLoading, rows, dayType, mpi, snapshot]);
}
