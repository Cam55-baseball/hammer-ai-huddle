/**
 * Wrapper around emitAsbEvent for Wave 1 runtime topics.
 *
 * - Append-only. No mutation, no upsert, no PATCH.
 * - Idempotency derived deterministically via canonical engineVersion helper.
 * - All topics namespaced (`session.*`, `prescription.*`, `runtime.*`) so
 *   parity validators and grep guards can recognize them.
 */
import { emitAsbEvent, type AsbEmitRow } from "@/lib/asb/emit";
import {
  ENGINE_VERSION,
  computeIdempotencyKey,
} from "@/lib/asb/engineVersion";

export type RuntimeTopic =
  | "prescription.daily.rendered"
  | "prescription.override.requested"
  | "prescription.override.acknowledged"
  | "session.started"
  | "session.block.started"
  | "session.block.completed"
  | "session.block.modified"
  | "session.block.skipped"
  | "session.block.substituted"
  | "session.deviation.logged"
  | "session.response.captured"
  | "runtime.feedback.captured";

export interface RuntimeEmitInput {
  athleteId: string;
  actorId: string | null;
  actorRole: AsbEmitRow["actor_role"];
  topic: RuntimeTopic;
  payload: Record<string, unknown>;
  causalityRefs?: string[];
  lineageRefs?: string[];
}

function randomEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export async function emitRuntimeEvent(input: RuntimeEmitInput): Promise<string> {
  const occurredAt = new Date().toISOString();
  const eventId = randomEventId();
  const idempotencyKey = await computeIdempotencyKey({
    athlete_id: input.athleteId,
    topic_id: input.topic,
    occurred_at: occurredAt,
    payload: input.payload,
  });
  const row: AsbEmitRow = {
    event_id: eventId,
    athlete_id: input.athleteId,
    topic_id: input.topic,
    actor_role: input.actorRole,
    actor_id: input.actorId,
    occurred_at: occurredAt,
    ingested_at: occurredAt,
    effective_at: occurredAt,
    valid_from: occurredAt,
    valid_to: null,
    payload: input.payload,
    engine_version: ENGINE_VERSION,
    idempotency_key: idempotencyKey,
    causality_refs: input.causalityRefs ?? [],
    lineage_refs: input.lineageRefs ?? [],
  };
  await emitAsbEvent(row);
  return eventId;
}
