// src/lib/wic/trainingContext.ts — Phase 4.
//
// CONSTITUTIONAL AUTHORITY FOR TRAINING CONTEXT.
//
// This module defines the single, deterministic representation of an athlete's
// training context. Every downstream engine (Speed, Bat Speed, Lifts,
// Conditioning, Cross-Sport, Recovery, Warm-Up, Arm-Care, ...) MUST consume the
// same `TrainingContext` object. No engine may infer or override seasonal
// emphasis independently.
//
// Phase 4 defines context — it does NOT redesign the workout engines. All
// programming content (movement selection, sets/reps, intensity) is untouched.
//
// This file must remain in shape parity with:
//   supabase/functions/_shared/wic/trainingContext.ts

export const CONTEXT_VERSION = "wic_ctx_v1";

// ---------------------------------------------------------------------------
// Canonical Season Phases (12)
// ---------------------------------------------------------------------------

export type SeasonPhaseCanonical =
  | "offseason_q1"
  | "offseason_q2"
  | "offseason_q3"
  | "offseason_q4"
  | "transition"
  | "preseason"
  | "spring_training"
  | "regular_season"
  | "tournament"
  | "postseason"
  | "recovery_week"
  | "deload_week";

export type TrainingEmphasis =
  | "hypertrophy"
  | "max_strength"
  | "strength_to_power"
  | "power_transfer"
  | "speed_development"
  | "bat_speed_development"
  | "arm_care"
  | "in_season_maintenance"
  | "recovery_only"
  | "movement_literacy"
  | "muscle_capacity"
  | "conditioning_repeat_explosive"
  | "game_readiness";

export type RecoveryPriority = "low" | "moderate" | "elevated" | "high" | "maximum";

export type ConditioningProfileId =
  | "cond_high_volume_base"
  | "cond_capacity_transfer"
  | "cond_repeat_explosive"
  | "cond_game_replication"
  | "cond_maintain_minimal"
  | "cond_recovery_only"
  | "cond_off";

export type PracticeRelationship =
  | "practice_primary"
  | "practice_replaces_lift"
  | "practice_supplemented_by_lift"
  | "practice_none"
  | "practice_replaced_by_game"
  | "practice_light_activation";

export interface PhaseDefinition {
  id: SeasonPhaseCanonical;
  display: string;
  objective: string;
  permittedEmphasis: TrainingEmphasis[];
  restrictedEmphasis: TrainingEmphasis[];
  recoveryPriority: RecoveryPriority;
  defaultConditioning: ConditioningProfileId;
  defaultPracticeRelationship: PracticeRelationship;
}

export const SEASON_REGISTRY: Record<SeasonPhaseCanonical, PhaseDefinition> = {
  offseason_q1: {
    id: "offseason_q1",
    display: "Offseason Quarter 1",
    objective: "Restore capacity, correct asymmetries, rebuild tissue tolerance.",
    permittedEmphasis: ["hypertrophy", "muscle_capacity", "movement_literacy", "arm_care"],
    restrictedEmphasis: ["game_readiness", "power_transfer"],
    recoveryPriority: "elevated",
    defaultConditioning: "cond_high_volume_base",
    defaultPracticeRelationship: "practice_none",
  },
  offseason_q2: {
    id: "offseason_q2",
    display: "Offseason Quarter 2",
    objective: "Build maximum strength and structural resilience.",
    permittedEmphasis: ["max_strength", "muscle_capacity", "arm_care", "movement_literacy"],
    restrictedEmphasis: ["game_readiness", "recovery_only"],
    recoveryPriority: "moderate",
    defaultConditioning: "cond_capacity_transfer",
    defaultPracticeRelationship: "practice_none",
  },
  offseason_q3: {
    id: "offseason_q3",
    display: "Offseason Quarter 3",
    objective: "Convert strength to power; introduce bat-speed and sprint work.",
    permittedEmphasis: ["strength_to_power", "power_transfer", "speed_development", "bat_speed_development", "arm_care"],
    restrictedEmphasis: ["recovery_only"],
    recoveryPriority: "moderate",
    defaultConditioning: "cond_repeat_explosive",
    defaultPracticeRelationship: "practice_supplemented_by_lift",
  },
  offseason_q4: {
    id: "offseason_q4",
    display: "Late Offseason",
    objective: "Peak power expression, sport-specific transfer, competition readiness.",
    permittedEmphasis: ["power_transfer", "speed_development", "bat_speed_development", "game_readiness", "arm_care"],
    restrictedEmphasis: ["hypertrophy"],
    recoveryPriority: "elevated",
    defaultConditioning: "cond_game_replication",
    defaultPracticeRelationship: "practice_supplemented_by_lift",
  },
  transition: {
    id: "transition",
    display: "Transition",
    objective: "Bridge seasons — restore CNS, decompress joints, retain neural quality.",
    permittedEmphasis: ["movement_literacy", "muscle_capacity", "recovery_only", "arm_care"],
    restrictedEmphasis: ["max_strength", "game_readiness"],
    recoveryPriority: "high",
    defaultConditioning: "cond_recovery_only",
    defaultPracticeRelationship: "practice_none",
  },
  preseason: {
    id: "preseason",
    display: "Preseason",
    objective: "Sharpen game readiness while retaining strength and power qualities.",
    permittedEmphasis: ["game_readiness", "power_transfer", "speed_development", "bat_speed_development", "in_season_maintenance", "arm_care"],
    restrictedEmphasis: ["hypertrophy"],
    recoveryPriority: "elevated",
    defaultConditioning: "cond_game_replication",
    defaultPracticeRelationship: "practice_supplemented_by_lift",
  },
  spring_training: {
    id: "spring_training",
    display: "Spring Training",
    objective: "Repeated-day readiness — maintenance dose lifts, high skill density.",
    permittedEmphasis: ["in_season_maintenance", "speed_development", "bat_speed_development", "game_readiness", "arm_care"],
    restrictedEmphasis: ["max_strength", "hypertrophy"],
    recoveryPriority: "elevated",
    defaultConditioning: "cond_maintain_minimal",
    defaultPracticeRelationship: "practice_primary",
  },
  regular_season: {
    id: "regular_season",
    display: "Regular Season",
    objective: "Preserve output — minimal-effective-dose lifting, protect CNS for games.",
    permittedEmphasis: ["in_season_maintenance", "speed_development", "bat_speed_development", "arm_care", "game_readiness"],
    restrictedEmphasis: ["hypertrophy", "max_strength"],
    recoveryPriority: "high",
    defaultConditioning: "cond_maintain_minimal",
    defaultPracticeRelationship: "practice_primary",
  },
  tournament: {
    id: "tournament",
    display: "Tournament",
    objective: "Peak day-of readiness across stacked games.",
    permittedEmphasis: ["game_readiness", "arm_care", "recovery_only"],
    restrictedEmphasis: ["hypertrophy", "max_strength", "strength_to_power"],
    recoveryPriority: "maximum",
    defaultConditioning: "cond_recovery_only",
    defaultPracticeRelationship: "practice_replaced_by_game",
  },
  postseason: {
    id: "postseason",
    display: "Postseason",
    objective: "Peak neural output — protect health, retain expression.",
    permittedEmphasis: ["game_readiness", "in_season_maintenance", "arm_care"],
    restrictedEmphasis: ["hypertrophy", "max_strength"],
    recoveryPriority: "maximum",
    defaultConditioning: "cond_maintain_minimal",
    defaultPracticeRelationship: "practice_primary",
  },
  recovery_week: {
    id: "recovery_week",
    display: "Recovery Week",
    objective: "Systemic recovery — parasympathetic, tissue, joint.",
    permittedEmphasis: ["recovery_only", "movement_literacy", "arm_care"],
    restrictedEmphasis: ["max_strength", "power_transfer", "game_readiness"],
    recoveryPriority: "maximum",
    defaultConditioning: "cond_recovery_only",
    defaultPracticeRelationship: "practice_none",
  },
  deload_week: {
    id: "deload_week",
    display: "Deload Week",
    objective: "Reduce load ~40–60% while retaining movement quality.",
    permittedEmphasis: ["movement_literacy", "in_season_maintenance", "arm_care", "recovery_only"],
    restrictedEmphasis: ["max_strength", "power_transfer"],
    recoveryPriority: "high",
    defaultConditioning: "cond_maintain_minimal",
    defaultPracticeRelationship: "practice_light_activation",
  },
};

// ---------------------------------------------------------------------------
// Canonical Day Types
// ---------------------------------------------------------------------------

export type DayType =
  | "game_day"
  | "practice_day"
  | "practice_plus_game"
  | "tournament_day"
  | "recovery_day"
  | "off_day"
  | "travel_day"
  | "deload_day"
  | "training_day";

export const DAY_TYPE_DISPLAY: Record<DayType, string> = {
  game_day: "Game Day",
  practice_day: "Practice Day",
  practice_plus_game: "Practice + Game",
  tournament_day: "Tournament Day",
  recovery_day: "Recovery Day",
  off_day: "Off Day",
  travel_day: "Travel Day",
  deload_day: "Deload Day",
  training_day: "Training Day",
};

// ---------------------------------------------------------------------------
// Profile Ids (populated by future phases; wired now for constitutional intake)
// ---------------------------------------------------------------------------

export type RecoveryProfileId =
  | "recov_offseason_standard"
  | "recov_offseason_capacity"
  | "recov_transition_maximum"
  | "recov_in_season_protect"
  | "recov_tournament_maximum"
  | "recov_deload"
  | "recov_recovery_week";

export type AdaptationProfileId =
  | "adapt_capacity_build"
  | "adapt_strength_build"
  | "adapt_power_convert"
  | "adapt_peak_expression"
  | "adapt_in_season_maintain"
  | "adapt_game_ready"
  | "adapt_recover"
  | "adapt_movement_literacy";

export type LegalityProfileId =
  | "legal_offseason_open"
  | "legal_offseason_strength"
  | "legal_offseason_power"
  | "legal_transition_restricted"
  | "legal_preseason_focused"
  | "legal_in_season_protective"
  | "legal_tournament_locked"
  | "legal_deload_reduced"
  | "legal_recovery_only";

interface PhaseProfiles {
  recovery: RecoveryProfileId;
  adaptation: AdaptationProfileId;
  legality: LegalityProfileId;
}

export const PHASE_PROFILES: Record<SeasonPhaseCanonical, PhaseProfiles> = {
  offseason_q1: { recovery: "recov_offseason_capacity", adaptation: "adapt_capacity_build", legality: "legal_offseason_open" },
  offseason_q2: { recovery: "recov_offseason_standard", adaptation: "adapt_strength_build", legality: "legal_offseason_strength" },
  offseason_q3: { recovery: "recov_offseason_standard", adaptation: "adapt_power_convert", legality: "legal_offseason_power" },
  offseason_q4: { recovery: "recov_offseason_standard", adaptation: "adapt_peak_expression", legality: "legal_offseason_power" },
  transition: { recovery: "recov_transition_maximum", adaptation: "adapt_recover", legality: "legal_transition_restricted" },
  preseason: { recovery: "recov_in_season_protect", adaptation: "adapt_game_ready", legality: "legal_preseason_focused" },
  spring_training: { recovery: "recov_in_season_protect", adaptation: "adapt_in_season_maintain", legality: "legal_in_season_protective" },
  regular_season: { recovery: "recov_in_season_protect", adaptation: "adapt_in_season_maintain", legality: "legal_in_season_protective" },
  tournament: { recovery: "recov_tournament_maximum", adaptation: "adapt_game_ready", legality: "legal_tournament_locked" },
  postseason: { recovery: "recov_tournament_maximum", adaptation: "adapt_game_ready", legality: "legal_in_season_protective" },
  recovery_week: { recovery: "recov_recovery_week", adaptation: "adapt_recover", legality: "legal_recovery_only" },
  deload_week: { recovery: "recov_deload", adaptation: "adapt_movement_literacy", legality: "legal_deload_reduced" },
};

// ---------------------------------------------------------------------------
// Legacy phase adapter (bridges the 6-phase WkPhase to the 12 canonical phases)
// ---------------------------------------------------------------------------

export function toCanonicalPhase(legacy: string | null | undefined): SeasonPhaseCanonical {
  switch (legacy) {
    case "os_q1": return "offseason_q1";
    case "os_q2": return "offseason_q2";
    case "os_q3": return "offseason_q3";
    case "os_q4": return "offseason_q4";
    case "in_season": return "regular_season";
    case "post_season": return "transition";
    // Passthrough for anyone already using canonical ids.
    case "offseason_q1":
    case "offseason_q2":
    case "offseason_q3":
    case "offseason_q4":
    case "transition":
    case "preseason":
    case "spring_training":
    case "regular_season":
    case "tournament":
    case "postseason":
    case "recovery_week":
    case "deload_week":
      return legacy;
    default:
      return "offseason_q2";
  }
}

// ---------------------------------------------------------------------------
// TrainingContext object
// ---------------------------------------------------------------------------

export interface TrainingContext {
  context_version: string;              // CONTEXT_VERSION
  generation_id: string | null;         // resolved by provider (matches snapshotIdentity.generation_id)
  plan_date: string;

  season_phase: SeasonPhaseCanonical;
  season_display: string;
  legacy_phase: string;                 // the underlying WkPhase (for engine compatibility)

  day_type: DayType;
  day_type_display: string;

  recovery_profile_id: RecoveryProfileId;
  adaptation_profile_id: AdaptationProfileId;
  legality_profile_id: LegalityProfileId;

  conditioning_profile_id: ConditioningProfileId;
  practice_relationship: PracticeRelationship;

  recovery_priority: RecoveryPriority;
  permitted_emphasis: TrainingEmphasis[];
  restricted_emphasis: TrainingEmphasis[];

  resolved_at: string;                  // ISO
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export interface ResolveInput {
  planDate: string;
  legacyPhase: string;                  // WkPhase from resolveWkPhase
  isGameDay: boolean;
  isPracticeDay: boolean;
  isTournamentDay?: boolean;
  isTravelDay?: boolean;
  isRecoveryDay?: boolean;
  isOffDay?: boolean;
  isDeloadDay?: boolean;
  generationId?: string | null;
  // Optional overrides for future phases
  canonicalPhaseOverride?: SeasonPhaseCanonical | null;
}

/** Resolve the canonical training day type. Exactly one wins. */
export function resolveDayType(i: {
  isGameDay: boolean;
  isPracticeDay: boolean;
  isTournamentDay?: boolean;
  isTravelDay?: boolean;
  isRecoveryDay?: boolean;
  isOffDay?: boolean;
  isDeloadDay?: boolean;
}): DayType {
  if (i.isTournamentDay) return "tournament_day";
  if (i.isGameDay && i.isPracticeDay) return "practice_plus_game";
  if (i.isGameDay) return "game_day";
  if (i.isPracticeDay) return "practice_day";
  if (i.isRecoveryDay) return "recovery_day";
  if (i.isOffDay) return "off_day";
  if (i.isTravelDay) return "travel_day";
  if (i.isDeloadDay) return "deload_day";
  return "training_day";
}

/** Deterministic single-pipeline resolver. Same inputs → identical context. */
export function resolveTrainingContext(input: ResolveInput): TrainingContext {
  const canonical = input.canonicalPhaseOverride ?? toCanonicalPhase(input.legacyPhase);
  const def = SEASON_REGISTRY[canonical];
  const profiles = PHASE_PROFILES[canonical];
  const day = resolveDayType(input);

  return {
    context_version: CONTEXT_VERSION,
    generation_id: input.generationId ?? null,
    plan_date: input.planDate,

    season_phase: canonical,
    season_display: def.display,
    legacy_phase: input.legacyPhase,

    day_type: day,
    day_type_display: DAY_TYPE_DISPLAY[day],

    recovery_profile_id: profiles.recovery,
    adaptation_profile_id: profiles.adaptation,
    legality_profile_id: profiles.legality,

    conditioning_profile_id: def.defaultConditioning,
    practice_relationship: def.defaultPracticeRelationship,

    recovery_priority: def.recoveryPriority,
    permitted_emphasis: def.permittedEmphasis,
    restricted_emphasis: def.restrictedEmphasis,

    resolved_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validation helpers (client & server both consume)
// ---------------------------------------------------------------------------

export interface ContextValidationIssue {
  code: string;
  severity: "fatal" | "warn";
  message: string;
}

/** Verify a set of prescription rows all reference the same TrainingContext. */
export function validateContextConsistency(
  ctx: TrainingContext | null | undefined,
  rows: Array<{ why_payload?: { training_context?: Partial<TrainingContext> | null } | null }>,
): ContextValidationIssue[] {
  const out: ContextValidationIssue[] = [];
  if (!ctx) {
    out.push({ code: "context_missing", severity: "fatal", message: "No TrainingContext resolved before publication." });
    return out;
  }
  const phases = new Set<string>();
  const days = new Set<string>();
  const legalities = new Set<string>();
  const recoveries = new Set<string>();
  const adaptations = new Set<string>();
  const versions = new Set<string>();
  for (const r of rows) {
    const tc = r.why_payload?.training_context;
    if (!tc) {
      out.push({ code: "row_missing_training_context", severity: "fatal", message: "Prescription row is missing training_context." });
      continue;
    }
    if (tc.season_phase) phases.add(tc.season_phase);
    if (tc.day_type) days.add(tc.day_type);
    if (tc.legality_profile_id) legalities.add(tc.legality_profile_id);
    if (tc.recovery_profile_id) recoveries.add(tc.recovery_profile_id);
    if (tc.adaptation_profile_id) adaptations.add(tc.adaptation_profile_id);
    if (tc.context_version) versions.add(tc.context_version);
  }
  if (phases.size > 1) out.push({ code: "conflicting_season_phase", severity: "fatal", message: `Multiple season phases in same plan: ${[...phases].join(", ")}` });
  if (days.size > 1) out.push({ code: "conflicting_day_type", severity: "fatal", message: `Multiple day types in same plan: ${[...days].join(", ")}` });
  if (legalities.size > 1) out.push({ code: "conflicting_legality_profile", severity: "fatal", message: `Multiple legality profiles: ${[...legalities].join(", ")}` });
  if (recoveries.size > 1) out.push({ code: "conflicting_recovery_profile", severity: "fatal", message: `Multiple recovery profiles: ${[...recoveries].join(", ")}` });
  if (adaptations.size > 1) out.push({ code: "conflicting_adaptation_profile", severity: "fatal", message: `Multiple adaptation profiles: ${[...adaptations].join(", ")}` });
  if (versions.size > 1) out.push({ code: "conflicting_context_version", severity: "fatal", message: `Multiple context versions: ${[...versions].join(", ")}` });
  return out;
}
