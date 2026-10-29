import type { AthleteContextEnvelope, EnvelopeEntry } from "./envelope";

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

/**
 * Canonical spine projection over a raw `get_athlete_context_envelope` payload.
 *
 * Exported so boundary tests can start from the *database representation* of a
 * row (the exact JSON the RPC emits) instead of hand-injecting the derived key
 * they are meant to be verifying.
 */
export function spineVariables(env: AthleteContextEnvelope | null): ContextVariable[] {
  return [
    fromEnvelope(env, "sport_primary", "Sport", "identity"),
    fromEnvelope(env, "date_of_birth", "Birthday", "identity"),
    fromEnvelope(env, "goal_summary", "Primary goal", "goals"),
    fromEnvelope(env, "goal_horizon", "Goal horizon", "goals"),
    fromEnvelope(env, "category_goals", "Ranked category goals", "goals"),
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
    fromEnvelope(env, "anthropometrics", "Anthropometrics", "physiology"),
    fromEnvelope(env, "position_primary", "Primary position", "identity"),
    fromEnvelope(env, "position_secondary", "Secondary positions", "identity"),
    fromEnvelope(env, "throws_hand", "Throws hand", "identity"),
    fromEnvelope(env, "bats_hand", "Bats side", "identity"),
    fromEnvelope(env, "competition_level", "Competition level", "identity"),
    fromEnvelope(env, "competition_age_group", "Age group", "identity"),
    fromEnvelope(env, "competition_home_state", "Home state", "identity"),
    fromEnvelope(env, "competition_play_state", "Play state", "identity"),
    fromEnvelope(env, "competition_events", "Notable events", "identity"),
    fromEnvelope(env, "education_stage", "Education stage", "identity"),
    fromEnvelope(env, "other_sports", "Other sports", "identity"),
    fromEnvelope(env, "lifting_history", "Lifting history", "development"),
  ];
}

/** Hook-free context built from a raw envelope payload (spine variables only). */
export function contextFromEnvelope(
  env: AthleteContextEnvelope | null,
  extra: ReadonlyArray<ContextVariable> = [],
): HammerAthleteContext {
  const vars = [...spineVariables(env), ...extra];
  const missing = vars.filter((v) => v.missing);
  return {
    variables: vars,
    missing,
    missingCount: missing.length,
    isLoading: false,
    envelope: env,
    get<T>(key: string) {
      return vars.find((v) => v.key === key) as ContextVariable<T> | undefined;
    },
  };
}
