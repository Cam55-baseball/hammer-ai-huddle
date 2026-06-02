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

import { NARRATIVE_VOICE } from "@/lib/relational/copy";

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
