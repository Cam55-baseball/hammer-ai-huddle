/**
 * Megaphase 151–160 — Phases 152/153/154 canonical event schemas.
 *
 * Constitutional envelope shared by all relational primitives. All schemas
 * are additive — no existing topic is modified. Relational primitives are
 * interpretive overlays and never author organism_truth, athlete_intent,
 * authority_override, hard_stop, or rehabilitation_state.
 *
 * Pure module. No I/O. No Date.now / Math.random. Replay-safe.
 */
import { z } from "zod";

// ─── Constitutional envelope ────────────────────────────────────────────────

export const VISIBILITY_SCOPES = [
  "self",
  "coach",
  "parent",
  "org",
  "external",
  "demo",
] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const RELATIONAL_AUTHORITY = [
  "self",
  "coach",
  "parent",
  "clinician",
  "system_inferred",
] as const;
export type RelationalAuthority = (typeof RELATIONAL_AUTHORITY)[number];

export const RelationalEnvelope = z.object({
  engine_version: z.string().min(1),
  reasoning_version: z.string().min(1),
  visibility_scope: z.enum(VISIBILITY_SCOPES),
  confidence: z.number().min(0).max(1).nullable(),
  missingness: z.object({
    fields: z.array(z.string()),
    reason: z.enum(["not_observed", "redacted", "consent_withheld"]),
  }),
  authority: z.enum(RELATIONAL_AUTHORITY),
  lineage_parent_ids: z.array(z.string()),
  safeguarding_category: z.boolean().optional(),
});
export type RelationalEnvelope = z.infer<typeof RelationalEnvelope>;

// ─── Phase 152 — relational.conversation.* ─────────────────────────────────

export const SPEAKER_ROLES = [
  "athlete",
  "coach_hammer",
  "coach",
  "parent",
] as const;

export const ConversationTurnPayload = RelationalEnvelope.extend({
  thread_id: z.string().min(1),
  speaker_role: z.enum(SPEAKER_ROLES),
  /** Hashed pointer — raw text never lives in the ASB payload. */
  utterance_ref: z.string().min(1),
  intent_tag: z.string().min(1),
  recalled_event_ids: z.array(z.string()),
  /** Constitutional bound: per-turn trust delta is small and lineage-bound. */
  trust_delta: z.number().min(-0.1).max(0.1),
  counterparty_id: z.string().min(1).nullable(),
});
export type ConversationTurnPayload = z.infer<typeof ConversationTurnPayload>;

export const ConversationSharedPayload = RelationalEnvelope.extend({
  thread_id: z.string().min(1),
  shared_with_scope: z.enum(VISIBILITY_SCOPES),
  redaction_mask: z.array(z.string()),
  consent_event_id: z.string().min(1),
});

export const ConversationRedactedPayload = RelationalEnvelope.extend({
  thread_id: z.string().min(1),
  turn_ids: z.array(z.string()).min(1),
  reason: z.string().min(1),
  redacted_by_authority: z.enum(RELATIONAL_AUTHORITY),
});

// ─── Phase 153 — relational.psych.* ─────────────────────────────────────────

export const PSYCH_AXES = [
  "mood",
  "motivation",
  "confidence",
  "anxiety",
  "burnout_risk",
] as const;
export type PsychAxis = (typeof PSYCH_AXES)[number];

export const PSYCH_BANDS = ["crisis", "strained", "baseline", "elevated", "peak"] as const;
export type PsychBand = (typeof PSYCH_BANDS)[number];

/** Frozen value→band mapping (replay-stable). */
export function bandOfValue(v: number): PsychBand {
  if (v <= -2) return "crisis";
  if (v <= -1) return "strained";
  if (v < 1) return "baseline";
  if (v < 2) return "elevated";
  return "peak";
}

export const PsychSelfReportPayload = RelationalEnvelope.extend({
  axis: z.enum(PSYCH_AXES),
  value: z.number().min(-2).max(2),
  note_ref: z.string().optional(),
}).refine((d) => d.authority === "self", {
  message: "psych.self_report.authority must be 'self'",
});

/** HARD CEILING: inferred confidence ≤ 0.7. Human supremacy. */
export const PSYCH_INFERRED_CONFIDENCE_CEILING = 0.7 as const;

export const PsychInferredPayload = RelationalEnvelope.extend({
  axis: z.enum(PSYCH_AXES),
  value: z.number().min(-2).max(2),
  evidence_event_ids: z.array(z.string()).min(1, {
    message: "psych.inferred requires ≥1 evidence event id",
  }),
})
  .refine((d) => d.authority === "system_inferred", {
    message: "psych.inferred.authority must be 'system_inferred'",
  })
  .refine(
    (d) => d.confidence !== null && d.confidence <= PSYCH_INFERRED_CONFIDENCE_CEILING,
    {
      message: `psych.inferred.confidence must be ≤ ${PSYCH_INFERRED_CONFIDENCE_CEILING}`,
    },
  );

export const PsychTransitionPayload = RelationalEnvelope.extend({
  axis: z.enum(PSYCH_AXES),
  from_band: z.enum(PSYCH_BANDS),
  to_band: z.enum(PSYCH_BANDS),
  trigger_event_id: z.string().min(1),
  requires_human_ack: z.boolean(),
});

// ─── Phase 154 — relational.developmental.* ────────────────────────────────

export const DEVELOPMENTAL_STAGES = [
  "youth_intro",
  "youth_developmental",
  "adolescent_early",
  "adolescent_mid",
  "adolescent_late",
  "adult_emerging",
  "adult_competitive",
  "adult_pro",
] as const;
export type DevelopmentalStage = (typeof DEVELOPMENTAL_STAGES)[number];

export const MINOR_STAGES: ReadonlyArray<DevelopmentalStage> = [
  "youth_intro",
  "youth_developmental",
  "adolescent_early",
  "adolescent_mid",
  "adolescent_late",
];

export function isMinorStage(s: DevelopmentalStage): boolean {
  return (MINOR_STAGES as ReadonlyArray<string>).includes(s);
}

export const AgeObservedPayload = RelationalEnvelope.extend({
  chronological_age_years: z.number().min(0).max(120),
  source: z.enum(["self", "parent", "verified_doc"]),
});

export const GrowthAttestationPayload = RelationalEnvelope.extend({
  height_cm: z.number().positive().optional(),
  mass_kg: z.number().positive().optional(),
  attested_by_authority: z.enum(RELATIONAL_AUTHORITY),
  measurement_window_days: z.number().int().min(1),
});

/** Sensitive markers require clinician observation. */
export const SENSITIVE_PUBERTY_MARKERS = ["tanner_stage"] as const;

export const PubertyMarkerPayload = RelationalEnvelope.extend({
  marker_code: z.string().min(1),
  observed_by: z.enum(["self", "parent", "clinician"]),
});

export const DeloadWindowPayload = RelationalEnvelope.extend({
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  reason: z.enum(["growth_spurt", "puberty_transition", "chronological_load"]),
  load_ceiling_pct: z.number().min(0).max(100),
});

export const DevelopmentalTransitionPayload = RelationalEnvelope.extend({
  from_stage: z.enum(DEVELOPMENTAL_STAGES),
  to_stage: z.enum(DEVELOPMENTAL_STAGES),
  evidence_event_ids: z.array(z.string()),
});

// ─── Canonical relational topic ids ────────────────────────────────────────

export const RELATIONAL_TOPICS = {
  conversation: {
    turn: "relational.conversation.turn",
    shared: "relational.conversation.shared",
    redacted: "relational.conversation.redacted",
    rejected: "relational.conversation.rejected",
  },
  psych: {
    self_report: "relational.psych.self_report",
    inferred: "relational.psych.inferred",
    transition: "relational.psych.transition",
  },
  developmental: {
    age_observed: "relational.developmental.age_observed",
    growth_attestation: "relational.developmental.growth_attestation",
    puberty_marker: "relational.developmental.puberty_marker",
    deload_window: "relational.developmental.deload_window",
    transition: "relational.developmental.transition",
    gate_decision: "relational.developmental.gate_decision",
  },
} as const;

export const RELATIONAL_TOPIC_PREFIX = "relational.";
