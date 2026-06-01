/**
 * Phases 152/153/154 — typed emit wrappers over emitRuntimeEvent.
 *
 * - Schema-validates payload at the emit boundary.
 * - Enforces inferred-confidence ceiling at the emit boundary (defense in
 *   depth — the schema also clamps).
 * - Asserts Hammer turn legality before emission.
 *
 * Uses canonical emitAsbEvent path. No parallel storage.
 */
import { emitAsbEvent, type AsbEmitRow } from "@/lib/asb/emit";
import { ENGINE_VERSION, computeIdempotencyKey } from "@/lib/asb/engineVersion";
import {
  ConversationTurnPayload,
  ConversationSharedPayload,
  ConversationRedactedPayload,
  PsychSelfReportPayload,
  PsychInferredPayload,
  PsychTransitionPayload,
  AgeObservedPayload,
  GrowthAttestationPayload,
  PubertyMarkerPayload,
  DeloadWindowPayload,
  DevelopmentalTransitionPayload,
  RELATIONAL_TOPICS,
} from "./schemas";
import { assertHammerTurnLegality } from "./hammerMemory";
import { clampInferredConfidence } from "./psychInference";

/** Pinned reasoning version for relational primitives. Replay anchor. */
export const RELATIONAL_REASONING_VERSION = "relational-1.0.0" as const;

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export interface RelationalEmitContext {
  athleteId: string;
  actorId: string | null;
  actorRole: AsbEmitRow["actor_role"];
  occurredAt: string;
}

async function emitRelational(
  ctx: RelationalEmitContext,
  topic: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const eventId = newEventId();
  const idempotencyKey = await computeIdempotencyKey({
    athlete_id: ctx.athleteId,
    topic_id: topic,
    occurred_at: ctx.occurredAt,
    payload,
  });
  const row: AsbEmitRow = {
    event_id: eventId,
    athlete_id: ctx.athleteId,
    topic_id: topic,
    actor_role: ctx.actorRole,
    actor_id: ctx.actorId,
    occurred_at: ctx.occurredAt,
    ingested_at: ctx.occurredAt,
    effective_at: ctx.occurredAt,
    valid_from: ctx.occurredAt,
    valid_to: null,
    payload,
    engine_version: ENGINE_VERSION,
    idempotency_key: idempotencyKey,
    causality_refs: [],
    lineage_refs: (payload.lineage_parent_ids as string[]) ?? [],
  };
  await emitAsbEvent(row);
  return eventId;
}

// ─── Conversation ──────────────────────────────────────────────────────────

export interface ConversationTurnEmitInput {
  ctx: RelationalEmitContext;
  payload: Omit<
    ConversationTurnPayload,
    "engine_version" | "reasoning_version"
  >;
  hammerContext?: {
    claims_recall: boolean;
    references_recruiter: boolean;
    parent_consent_event_id: string | null;
    athlete_is_minor: boolean;
    has_unstated_gap: boolean;
  };
}

export async function emitConversationTurn(
  input: ConversationTurnEmitInput,
): Promise<string> {
  const full: ConversationTurnPayload = {
    ...input.payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  ConversationTurnPayload.parse(full);
  if (full.speaker_role === "coach_hammer") {
    if (!input.hammerContext) {
      throw new Error("HAMMER_TURN_REQUIRES_CONTEXT");
    }
    assertHammerTurnLegality(full, input.hammerContext);
  }
  return emitRelational(input.ctx, RELATIONAL_TOPICS.conversation.turn, full);
}

export async function emitConversationShared(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof ConversationSharedPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  ConversationSharedPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.conversation.shared, full);
}

export async function emitConversationRedacted(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof ConversationRedactedPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  ConversationRedactedPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.conversation.redacted, full);
}

// ─── Psych ──────────────────────────────────────────────────────────────────

export async function emitPsychSelfReport(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof PsychSelfReportPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  PsychSelfReportPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.psych.self_report, full);
}

export async function emitPsychInferred(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof PsychInferredPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const clamped = {
    ...payload,
    confidence:
      payload.confidence === null
        ? null
        : clampInferredConfidence(payload.confidence),
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  PsychInferredPayload.parse(clamped);
  return emitRelational(ctx, RELATIONAL_TOPICS.psych.inferred, clamped);
}

export async function emitPsychTransition(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof PsychTransitionPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  PsychTransitionPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.psych.transition, full);
}

// ─── Developmental ─────────────────────────────────────────────────────────

export async function emitAgeObserved(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof AgeObservedPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  AgeObservedPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.developmental.age_observed, full);
}

export async function emitGrowthAttestation(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof GrowthAttestationPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  GrowthAttestationPayload.parse(full);
  return emitRelational(
    ctx,
    RELATIONAL_TOPICS.developmental.growth_attestation,
    full,
  );
}

export async function emitPubertyMarker(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof PubertyMarkerPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  PubertyMarkerPayload.parse(full);
  return emitRelational(
    ctx,
    RELATIONAL_TOPICS.developmental.puberty_marker,
    full,
  );
}

export async function emitDeloadWindow(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof DeloadWindowPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  DeloadWindowPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.developmental.deload_window, full);
}

export async function emitDevelopmentalTransition(
  ctx: RelationalEmitContext,
  payload: Omit<
    ReturnType<typeof DevelopmentalTransitionPayload.parse>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = {
    ...payload,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
  DevelopmentalTransitionPayload.parse(full);
  return emitRelational(ctx, RELATIONAL_TOPICS.developmental.transition, full);
}
