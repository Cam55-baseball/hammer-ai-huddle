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
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { useDayState } from "@/hooks/useDayState";
import { useMPIScores } from "@/hooks/useMPIScores";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAthleteContextEnvelope,
  type AthleteContextEnvelope,
  type EnvelopeEntry,
} from "@/lib/hammer/context/envelope";
import {
  latestByTopicPrefix,
  projectLatest,
} from "@/lib/command/projections";

export type ContextConfidence = "high" | "medium" | "low" | "missing";

export interface ContextLineage {
  readonly owner: string;
  readonly source: string;
  readonly rawConfidence: string;
}

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
    | "plan"
    | "lifecycle";
  readonly value: T | null;
  readonly source: string;
  readonly confidence: ContextConfidence;
  readonly missing: boolean;
  readonly lastUpdated: string | null;
  readonly lineage: ContextLineage;
}

export interface HammerAthleteContext {
  readonly variables: ReadonlyArray<ContextVariable>;
  readonly missing: ReadonlyArray<ContextVariable>;
  readonly isLoading: boolean;
  readonly missingCount: number;
  readonly envelope: AthleteContextEnvelope | null;
  get<T = unknown>(key: string): ContextVariable<T> | undefined;
}

function normalizeConfidence(raw: string | undefined | null): ContextConfidence {
  if (!raw) return "missing";
  switch (raw) {
    case "high":
    case "corroborated":
    case "derived":
      return "high";
    case "self_report":
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "missing":
    default:
      return raw === "missing" ? "missing" : "low";
  }
}

function fromEnvelope<T>(
  envelope: AthleteContextEnvelope | null,
  key: string,
  label: string,
  domain: ContextVariable["domain"],
): ContextVariable<T> {
  const e: EnvelopeEntry | undefined = envelope?.[key];
  const value = (e?.value ?? null) as T | null;
  const missing = e?.missing ?? (value === null || value === undefined);
  return {
    key,
    label,
    domain,
    value: missing ? null : value,
    source: e?.source ?? `envelope.${key}`,
    confidence: normalizeConfidence(e?.confidence as string | undefined),
    missing,
    lastUpdated: (e?.last_updated as string | null) ?? null,
    lineage: {
      owner: (e?.owner as string) ?? "unknown",
      source: e?.source ?? `envelope.${key}`,
      rawConfidence: (e?.confidence as string) ?? "missing",
    },
  };
}

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
  const { snapshot } = useHIESnapshot();
  const { data: rows } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { dayType } = useDayState();
  const { data: mpi } = useMPIScores();

  const { data: envelope, isLoading: envLoading } = useQuery({
    queryKey: ["hammer-context-envelope", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: () => fetchAthleteContextEnvelope(user!.id),
  });

  return useMemo<HammerAthleteContext>(() => {
    const env = envelope ?? null;
    const readinessEv = rows ? latestByTopicPrefix(rows, "behavioral.readiness") : null;
    const sleepEv = rows ? latestByTopicPrefix(rows, "behavioral.sleep") : null;
    const planEv = rows ? latestByTopicPrefix(rows, "athlete.plan.today") : null;
    const planP = planEv
      ? (projectLatest<Record<string, unknown>>(planEv).value as Record<string, unknown> | null)
      : null;

    const vars: ContextVariable[] = [
      // Spine variables (envelope)
      fromEnvelope(env, "sport_primary", "Sport", "identity"),
      fromEnvelope(env, "goal_summary", "Primary goal", "goals"),
      fromEnvelope(env, "goal_horizon", "Goal horizon", "goals"),
      fromEnvelope(env, "weekly_availability_days", "Days per week", "schedule"),
      fromEnvelope(env, "weekly_availability_hours", "Hours per week", "schedule"),
      fromEnvelope(env, "typical_session_length_min", "Session length (min)", "schedule"),
      fromEnvelope(env, "training_focus", "Training focus", "goals"),
      fromEnvelope(env, "development_priorities", "Development priorities", "development"),
      fromEnvelope(env, "lifting_age_years", "Lifting age", "development"),
      fromEnvelope(env, "years_in_sport", "Years in sport", "development"),
      fromEnvelope(env, "school_grade", "School year", "identity"),
      fromEnvelope(env, "season_phase", "Season phase", "season"),
      fromEnvelope(env, "injury_history", "Injury constraints", "injury"),
      fromEnvelope(env, "equipment_effective", "Equipment (effective)", "equipment"),
      fromEnvelope(env, "lifecycle_band", "Lifecycle band", "lifecycle"),
      fromEnvelope(env, "safeguarding_minor", "Safeguarding (minor)", "identity"),
      // Live signals (existing)
      mkLive("season_phase_runtime", "Season phase (runtime)", "season", dayType ?? null, "useDayState.dayType"),
      mkLive(
        "readiness",
        "Readiness",
        "physiology",
        readinessEv ? projectLatest(readinessEv).value : null,
        "asb:behavioral.readiness",
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
  }, [envelope, envLoading, rows, dayType, mpi, snapshot]);
}
