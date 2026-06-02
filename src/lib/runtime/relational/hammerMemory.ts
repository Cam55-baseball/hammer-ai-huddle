/**
 * Phase 152 — Coach Hammer relational memory constraints.
 *
 * Pure validators. Replay-stable. No I/O.
 *
 * Constitutional rules:
 *   1. Read-only over projection (Hammer never authors organism truth).
 *   2. Recall must cite — empty recalled_event_ids ⇒ no claim of memory.
 *   3. No silent escalation — inferred confidence ≤ 0.7; band-crossing
 *      into crisis/strained sets requires_human_ack.
 *   4. No commercial/recruiting authority — Hammer cannot author recruiter.*
 *      topics; for minor athletes, cannot reference recruiter context
 *      without a parent-consent event.
 *   5. Missingness explicit — turns with knowledge gaps must list them.
 */
import type { ConversationTurnPayload } from "./schemas";

export interface HammerTurnDraft {
  utterance_ref: string;
  claims_recall: boolean;
  recalled_event_ids: string[];
  references_recruiter: boolean;
  parent_consent_event_id: string | null;
  athlete_is_minor: boolean;
  missingness_fields: string[];
  has_unstated_gap: boolean;
}

export type HammerRejection =
  | "FABRICATED_RECALL"
  | "RECRUITER_REFERENCE_WITHOUT_CONSENT"
  | "MISSINGNESS_HIDDEN";

export interface HammerValidation {
  valid: boolean;
  rejections: HammerRejection[];
}

export function validateHammerTurn(draft: HammerTurnDraft): HammerValidation {
  const rejections: HammerRejection[] = [];

  // Rule 2: recall must cite.
  if (draft.claims_recall && draft.recalled_event_ids.length === 0) {
    rejections.push("FABRICATED_RECALL");
  }

  // Rule 4: recruiter reference for minor requires parent consent event.
  if (
    draft.references_recruiter &&
    draft.athlete_is_minor &&
    !draft.parent_consent_event_id
  ) {
    rejections.push("RECRUITER_REFERENCE_WITHOUT_CONSENT");
  }

  // Rule 5: missingness must be explicit.
  if (draft.has_unstated_gap && draft.missingness_fields.length === 0) {
    rejections.push("MISSINGNESS_HIDDEN");
  }

  return { valid: rejections.length === 0, rejections };
}

/**
 * Constitutional check before emitting a conversation.turn event for
 * speaker_role === "coach_hammer". Throws if invalid — emission is
 * constitutionally illegal in failure modes.
 */
export function assertHammerTurnLegality(
  payload: Pick<ConversationTurnPayload, "speaker_role" | "recalled_event_ids" | "missingness" | "intent_tag">,
  context: {
    claims_recall: boolean;
    references_recruiter: boolean;
    parent_consent_event_id: string | null;
    athlete_is_minor: boolean;
    has_unstated_gap: boolean;
  },
): void {
  if (payload.speaker_role !== "coach_hammer") return;
  const v = validateHammerTurn({
    utterance_ref: "",
    claims_recall: context.claims_recall,
    recalled_event_ids: payload.recalled_event_ids,
    references_recruiter: context.references_recruiter,
    parent_consent_event_id: context.parent_consent_event_id,
    athlete_is_minor: context.athlete_is_minor,
    missingness_fields: payload.missingness.fields,
    has_unstated_gap: context.has_unstated_gap,
  });
  if (!v.valid) {
    throw new Error(
      `HAMMER_TURN_CONSTITUTIONALLY_ILLEGAL: ${v.rejections.join(",")}`,
    );
  }
}

// ─── RR-5 — narrative reference legality ───────────────────────────────────

import { NARRATIVE_VOICE, LIFE_CONTEXT_VOICE } from "@/lib/relational/copy";

export type NarrativeRejection =
  | "FABRICATED_NARRATIVE_RECALL"
  | "NARRATIVE_DENYLIST_HIT"
  | "NARRATIVE_CONFIDENCE_EXCEEDED"
  | "NARRATIVE_UNDER_SAFEGUARDING";

export interface NarrativeReferenceDraft {
  /** Text the surface intends to render to the athlete. */
  utterance: string;
  /** Antecedent event IDs the surface claims to cite. */
  citedEventIds: string[];
  /** Inferred confidence in [0,1] for this reference. */
  inferredConfidence: number;
  /** True if the safeguarding sub-route currently holds the athlete. */
  safeguardingLockdown: boolean;
}

const NARRATIVE_INFERRED_CONFIDENCE_CEILING = 0.7 as const;

export function validateNarrativeReference(
  draft: NarrativeReferenceDraft,
): { valid: boolean; rejections: NarrativeRejection[] } {
  const rejections: NarrativeRejection[] = [];
  if (draft.safeguardingLockdown) {
    rejections.push("NARRATIVE_UNDER_SAFEGUARDING");
  }
  if (draft.citedEventIds.length === 0) {
    rejections.push("FABRICATED_NARRATIVE_RECALL");
  }
  if (draft.inferredConfidence > NARRATIVE_INFERRED_CONFIDENCE_CEILING) {
    rejections.push("NARRATIVE_CONFIDENCE_EXCEEDED");
  }
  const lc = draft.utterance.toLowerCase();
  for (const token of NARRATIVE_VOICE.denylist) {
    if (lc.includes(token)) {
      rejections.push("NARRATIVE_DENYLIST_HIT");
      break;
    }
  }
  return { valid: rejections.length === 0, rejections };
}

export function assertNarrativeReferenceLegality(
  draft: NarrativeReferenceDraft,
): void {
  const v = validateNarrativeReference(draft);
  if (!v.valid) {
    throw new Error(
      `NARRATIVE_REFERENCE_CONSTITUTIONALLY_ILLEGAL: ${v.rejections.join(",")}`,
    );
  }
}

// ─── RR-8 — life context reference legality ────────────────────────────────

export type LifeContextRejection =
  | "FABRICATED_LIFE_CONTEXT_RECALL"
  | "LIFE_CONTEXT_DENYLIST_HIT"
  | "LIFE_CONTEXT_CONFIDENCE_EXCEEDED"
  | "LIFE_CONTEXT_UNDER_SAFEGUARDING";

export interface LifeContextReferenceDraft {
  /** Text the surface intends to render to the athlete. */
  utterance: string;
  /** Antecedent disclosure event IDs the surface claims to cite. */
  citedEventIds: string[];
  /** Inferred confidence in [0,1] for this reference. */
  inferredConfidence: number;
  /** True if the safeguarding sub-route currently holds the athlete. */
  safeguardingLockdown: boolean;
}

const LIFE_CONTEXT_INFERRED_CONFIDENCE_CEILING = 0.7 as const;

export function validateLifeContextReference(
  draft: LifeContextReferenceDraft,
): { valid: boolean; rejections: LifeContextRejection[] } {
  const rejections: LifeContextRejection[] = [];
  if (draft.safeguardingLockdown) {
    rejections.push("LIFE_CONTEXT_UNDER_SAFEGUARDING");
  }
  if (draft.citedEventIds.length === 0) {
    rejections.push("FABRICATED_LIFE_CONTEXT_RECALL");
  }
  if (draft.inferredConfidence > LIFE_CONTEXT_INFERRED_CONFIDENCE_CEILING) {
    rejections.push("LIFE_CONTEXT_CONFIDENCE_EXCEEDED");
  }
  const lc = draft.utterance.toLowerCase();
  for (const token of LIFE_CONTEXT_VOICE.denylist) {
    if (lc.includes(token)) {
      rejections.push("LIFE_CONTEXT_DENYLIST_HIT");
      break;
    }
  }
  return { valid: rejections.length === 0, rejections };
}

export function assertLifeContextReferenceLegality(
  draft: LifeContextReferenceDraft,
): void {
  const v = validateLifeContextReference(draft);
  if (!v.valid) {
    throw new Error(
      `LIFE_CONTEXT_REFERENCE_CONSTITUTIONALLY_ILLEGAL: ${v.rejections.join(",")}`,
    );
  }
}

// ─── RR-5 ↔ RR-8 — single-callback arbitration ──────────────────────────────
//
// At most one memory callback may speak per assistant turn. This pure helper
// arbitrates between the RR-5 narrative resurfacing candidate and the RR-8
// life-context acknowledgement so the panel never renders both.
//
// Rules:
//   • If safeguardingLockdown → none (safeguarding suppresses both).
//   • Newest legal reference wins by occurred_at (ISO 8601 lexical compare).
//   • Ties resolved by lexical ordering of topic_tag ?? category ?? kind ?? "".
//   • Replay-safe: pure, no Date.now, no Math.random.

export interface ArbitrationNarrativeRef {
  event_id: string;
  occurred_at: string;
  topic_tag: string | null;
  kind: string;
}

export interface ArbitrationLifeContextRef {
  event_id: string;
  occurred_at: string;
  topic_tag: string | null;
  category: string;
}

export type MemoryCallback =
  | { kind: "narrative"; ref: ArbitrationNarrativeRef }
  | { kind: "life_context"; ref: ArbitrationLifeContextRef }
  | { kind: "none" };

export interface MemoryArbitrationInput {
  narrative: ArbitrationNarrativeRef | null;
  lifeContext: ArbitrationLifeContextRef | null;
  safeguardingLockdown: boolean;
}

function tieKey(
  ref:
    | ArbitrationNarrativeRef
    | ArbitrationLifeContextRef,
): string {
  if (ref.topic_tag) return ref.topic_tag;
  if ((ref as ArbitrationLifeContextRef).category) {
    return (ref as ArbitrationLifeContextRef).category;
  }
  if ((ref as ArbitrationNarrativeRef).kind) {
    return (ref as ArbitrationNarrativeRef).kind;
  }
  return "";
}

export function arbitrateMemoryCallback(
  input: MemoryArbitrationInput,
): MemoryCallback {
  if (input.safeguardingLockdown) return { kind: "none" };
  const { narrative, lifeContext } = input;
  if (!narrative && !lifeContext) return { kind: "none" };
  if (narrative && !lifeContext) return { kind: "narrative", ref: narrative };
  if (lifeContext && !narrative) {
    return { kind: "life_context", ref: lifeContext };
  }
  // Both present — newest wins, ties broken lexically by tieKey, then
  // by deterministic kind preference (narrative < life_context) so the
  // result is reproducible across replays.
  const n = narrative as ArbitrationNarrativeRef;
  const l = lifeContext as ArbitrationLifeContextRef;
  if (n.occurred_at !== l.occurred_at) {
    return n.occurred_at > l.occurred_at
      ? { kind: "narrative", ref: n }
      : { kind: "life_context", ref: l };
  }
  const nk = tieKey(n);
  const lk = tieKey(l);
  if (nk !== lk) {
    return nk < lk ? { kind: "narrative", ref: n } : { kind: "life_context", ref: l };
  }
  // Final deterministic tie-break: narrative wins by name ordering.
  return { kind: "narrative", ref: n };
}
