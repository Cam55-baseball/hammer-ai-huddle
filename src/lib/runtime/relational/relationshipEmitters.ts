/**
 * RR-4 — canonical emit wrappers for relational.relationship.*
 *
 * - Goes through emitAsbEvent / emitAsbLineage only. No parallel storage.
 * - Deterministic idempotency via computeIdempotencyKey over
 *   (athlete_id, topic_id, occurred_at, canonical(payload)).
 * - Every confirmed/revoked/paused emit writes a lineage edge back to the
 *   originating `created` event.
 */
import {
  emitAsbEvent,
  emitAsbLineage,
  type AsbEmitRow,
} from "@/lib/asb/emit";
import {
  ENGINE_VERSION,
  computeIdempotencyKey,
} from "@/lib/asb/engineVersion";
import { RELATIONAL_REASONING_VERSION } from "./emit";
import {
  RELATIONSHIP_TOPICS,
  RelationshipCreatedPayload,
  RelationshipConfirmedPayload,
  RelationshipRevokedPayload,
  RelationshipPausedPayload,
} from "./relationshipSchemas";
import type { z } from "zod";

export interface RelationshipEmitContext {
  /** Athlete (subject) timeline this event belongs to. */
  athleteId: string;
  /** Acting user (may be subject, counterparty, or system). */
  actorId: string | null;
  actorRole: AsbEmitRow["actor_role"];
  /** Deterministic anchor — invite issuance / acceptance / revocation time. */
  occurredAt: string;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function emitRelationship(
  ctx: RelationshipEmitContext,
  topic: string,
  payload: Record<string, unknown>,
  parentEventIds: string[],
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
    lineage_refs: parentEventIds,
  };
  await emitAsbEvent(row);
  // Lineage edges for transitions (skipped when there is no parent — i.e.
  // the `created` event itself).
  for (const parentId of parentEventIds) {
    await emitAsbLineage({
      parent_event_id: parentId,
      child_event_id: eventId,
      derivation_type: "relationship_transition",
      engine_version: ENGINE_VERSION,
    });
  }
  return eventId;
}

function withEnvelope<P extends Record<string, unknown>>(p: P): P & {
  engine_version: string;
  reasoning_version: string;
} {
  return {
    ...p,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
}

// ─── created ───────────────────────────────────────────────────────────────

export async function emitRelationshipCreated(
  ctx: RelationshipEmitContext,
  payload: Omit<
    z.infer<typeof RelationshipCreatedPayload>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = withEnvelope(payload);
  RelationshipCreatedPayload.parse(full);
  return emitRelationship(
    ctx,
    RELATIONSHIP_TOPICS.created,
    full,
    full.lineage_parent_ids ?? [],
  );
}

// ─── confirmed ─────────────────────────────────────────────────────────────

export async function emitRelationshipConfirmed(
  ctx: RelationshipEmitContext,
  payload: Omit<
    z.infer<typeof RelationshipConfirmedPayload>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = withEnvelope(payload);
  RelationshipConfirmedPayload.parse(full);
  return emitRelationship(
    ctx,
    RELATIONSHIP_TOPICS.confirmed,
    full,
    full.lineage_parent_ids,
  );
}

// ─── revoked ───────────────────────────────────────────────────────────────

export async function emitRelationshipRevoked(
  ctx: RelationshipEmitContext,
  payload: Omit<
    z.infer<typeof RelationshipRevokedPayload>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = withEnvelope(payload);
  RelationshipRevokedPayload.parse(full);
  return emitRelationship(
    ctx,
    RELATIONSHIP_TOPICS.revoked,
    full,
    full.lineage_parent_ids,
  );
}

// ─── paused ────────────────────────────────────────────────────────────────

export async function emitRelationshipPaused(
  ctx: RelationshipEmitContext,
  payload: Omit<
    z.infer<typeof RelationshipPausedPayload>,
    "engine_version" | "reasoning_version"
  >,
): Promise<string> {
  const full = withEnvelope(payload);
  RelationshipPausedPayload.parse(full);
  return emitRelationship(
    ctx,
    RELATIONSHIP_TOPICS.paused,
    full,
    full.lineage_parent_ids,
  );
}
