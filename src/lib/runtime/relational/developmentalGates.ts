/**
 * Phase 154 — developmental-stage gating matrix.
 *
 * Pure module. Replay-stable. No I/O.
 *
 * Commercial/recruiting authority CANNOT raise a gate. Active deload windows
 * always lower load_ceiling_pct further; never raise it.
 */
import {
  isMinorStage,
  type DevelopmentalStage,
} from "./schemas";

export type GateDecision =
  | "allowed"
  | "blocked"
  | "parent_only"
  | "parent_visible"
  | "self_visible"
  | "parent_gate"
  | "parent_consent_required"
  | "self_consent_plus_parent_notify"
  | "self_consent";

export interface StageGates {
  stage: DevelopmentalStage;
  load_ceiling_pct: number;
  recruiter: GateDecision;
  exposure: GateDecision;
  psych_inferred_safeguarding: GateDecision;
  conversation_shared_external: GateDecision;
  safeguarding_default: boolean;
}

const MATRIX: Record<DevelopmentalStage, StageGates> = {
  youth_intro: {
    stage: "youth_intro",
    load_ceiling_pct: 60,
    recruiter: "blocked",
    exposure: "blocked",
    psych_inferred_safeguarding: "parent_only",
    conversation_shared_external: "parent_consent_required",
    safeguarding_default: true,
  },
  youth_developmental: {
    stage: "youth_developmental",
    load_ceiling_pct: 70,
    recruiter: "blocked",
    exposure: "blocked",
    psych_inferred_safeguarding: "parent_only",
    conversation_shared_external: "parent_consent_required",
    safeguarding_default: true,
  },
  adolescent_early: {
    stage: "adolescent_early",
    load_ceiling_pct: 80,
    recruiter: "parent_gate",
    exposure: "parent_gate",
    psych_inferred_safeguarding: "parent_only",
    conversation_shared_external: "parent_consent_required",
    safeguarding_default: true,
  },
  adolescent_mid: {
    stage: "adolescent_mid",
    load_ceiling_pct: 85,
    recruiter: "parent_gate",
    exposure: "allowed",
    psych_inferred_safeguarding: "parent_visible",
    conversation_shared_external: "parent_consent_required",
    safeguarding_default: true,
  },
  adolescent_late: {
    stage: "adolescent_late",
    load_ceiling_pct: 95,
    recruiter: "parent_gate",
    exposure: "allowed",
    psych_inferred_safeguarding: "parent_visible",
    conversation_shared_external: "self_consent_plus_parent_notify",
    safeguarding_default: true,
  },
  adult_emerging: {
    stage: "adult_emerging",
    load_ceiling_pct: 100,
    recruiter: "allowed",
    exposure: "allowed",
    psych_inferred_safeguarding: "self_visible",
    conversation_shared_external: "self_consent",
    safeguarding_default: false,
  },
  adult_competitive: {
    stage: "adult_competitive",
    load_ceiling_pct: 100,
    recruiter: "allowed",
    exposure: "allowed",
    psych_inferred_safeguarding: "self_visible",
    conversation_shared_external: "self_consent",
    safeguarding_default: false,
  },
  adult_pro: {
    stage: "adult_pro",
    load_ceiling_pct: 100,
    recruiter: "allowed",
    exposure: "allowed",
    psych_inferred_safeguarding: "self_visible",
    conversation_shared_external: "self_consent",
    safeguarding_default: false,
  },
};

Object.freeze(MATRIX);
for (const k of Object.keys(MATRIX)) {
  Object.freeze(MATRIX[k as DevelopmentalStage]);
}

export function gatesFor(stage: DevelopmentalStage): StageGates {
  return MATRIX[stage];
}

/**
 * Effective load ceiling = min(stage_ceiling, active_deload_ceiling).
 * Deload windows never raise the ceiling.
 */
export function effectiveLoadCeiling(
  stage: DevelopmentalStage,
  activeDeloadCeilingPct: number | null,
): number {
  const stageCeil = gatesFor(stage).load_ceiling_pct;
  if (activeDeloadCeilingPct === null) return stageCeil;
  return Math.min(stageCeil, activeDeloadCeilingPct);
}

/**
 * Minor-athlete supremacy check for parent-consent-required topics.
 * Returns true if a parent-consent event is required for the given
 * (stage, topic_kind) combination.
 */
export function requiresParentConsent(
  stage: DevelopmentalStage,
  topicKind: "recruiter" | "exposure" | "conversation_external",
): boolean {
  if (!isMinorStage(stage)) return false;
  const g = gatesFor(stage);
  if (topicKind === "recruiter") {
    return g.recruiter === "parent_gate" || g.recruiter === "blocked";
  }
  if (topicKind === "exposure") {
    return g.exposure === "parent_gate" || g.exposure === "blocked";
  }
  return (
    g.conversation_shared_external === "parent_consent_required" ||
    g.conversation_shared_external === "self_consent_plus_parent_notify"
  );
}
