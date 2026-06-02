/**
 * RR-5 — canonical emit wrappers for relational.narrative.*
 *
 * Goes through emitAsbEvent / emitAsbLineage only. No parallel storage.
 * No mutable narrative tables. Narratives are replay-derived overlays.
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
import { RELATIONAL_REASONING_VERSION, type RelationalEmitContext } from "./emit";
import {
  NARRATIVE_TOPICS,
  MemoryAnchorPayload,
  SlumpMarkerPayload,
  BreakthroughMarkerPayload,
  IdentityReflectionPayload,
  ContextRecallPayload,
} from "./narrativeSchemas";
import type { z } from "zod";

export class NarrativeEmissionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "NarrativeEmissionError";
  }
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function withEnvelope<P extends Record<string, unknown>>(p: P) {
  return {
    ...p,
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  };
}

/**
 * Constitutional gate (RR-5 invariant 6): if a safeguarding lockdown is
 * active, narrative emission defers. Caller passes the current safeguarding
 * lockdown flag (derived projection); never read from a side channel.
 */
export interface NarrativeEmitGate {
  safeguardingLockdown: boolean;
}

function assertEmissionLegal(
  gate: NarrativeEmitGate,
  lineageParentIds: readonly string[],
): void {
  if (gate.safeguardingLockdown) {
    throw new NarrativeEmissionError(
      "SAFEGUARDING_LOCKDOWN",
      "narrative emission suppressed by active safeguarding route",
    );
  }
  if (lineageParentIds.length === 0) {
    // Defence in depth — schema also enforces this for cite-bound topics.
    throw new NarrativeEmissionError(
      "MISSING_LINEAGE",
      "narrative emission requires cited antecedents",
    );
  }
}

async function emitNarrative(
  ctx: RelationalEmitContext,
  topic: string,
  payload: Record<string, unknown>,
  parentEventIds: readonly string[],
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
    lineage_refs: [...parentEventIds],
  };
  await emitAsbEvent(row);
  for (const parentId of parentEventIds) {
    await emitAsbLineage({
      parent_event_id: parentId,
      child_event_id: eventId,
      derivation_type: "narrative_overlay",
      engine_version: ENGINE_VERSION,
    });
  }
  return eventId;
}

type Strip<T> = Omit<T, "engine_version" | "reasoning_version">;

export async function emitMemoryAnchor(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof MemoryAnchorPayload>>,
  gate: NarrativeEmitGate,
): Promise<string> {
  const full = withEnvelope(payload);
  MemoryAnchorPayload.parse(full);
  assertEmissionLegal(gate, full.lineage_parent_ids);
  return emitNarrative(ctx, NARRATIVE_TOPICS.memory_anchor, full, full.lineage_parent_ids);
}

export async function emitSlumpMarker(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof SlumpMarkerPayload>>,
  gate: NarrativeEmitGate,
): Promise<string> {
  const full = withEnvelope(payload);
  SlumpMarkerPayload.parse(full);
  assertEmissionLegal(gate, full.lineage_parent_ids);
  return emitNarrative(ctx, NARRATIVE_TOPICS.slump_marker, full, full.lineage_parent_ids);
}

export async function emitBreakthroughMarker(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof BreakthroughMarkerPayload>>,
  gate: NarrativeEmitGate,
): Promise<string> {
  const full = withEnvelope(payload);
  BreakthroughMarkerPayload.parse(full);
  assertEmissionLegal(gate, full.lineage_parent_ids);
  return emitNarrative(
    ctx,
    NARRATIVE_TOPICS.breakthrough_marker,
    full,
    full.lineage_parent_ids,
  );
}

/**
 * RR-5 invariant 7: identity_reflection is athlete-authored only. The actor
 * role must be 'athlete' AND payload.authority must be 'self' (schema-enforced).
 */
export async function emitIdentityReflection(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof IdentityReflectionPayload>>,
  gate: NarrativeEmitGate,
): Promise<string> {
  if (ctx.actorRole !== "athlete") {
    throw new NarrativeEmissionError(
      "NON_ATHLETE_REFLECTION",
      "identity_reflection may only be authored by the athlete (RR-5 invariant 7)",
    );
  }
  const full = withEnvelope(payload);
  IdentityReflectionPayload.parse(full);
  if (gate.safeguardingLockdown) {
    throw new NarrativeEmissionError(
      "SAFEGUARDING_LOCKDOWN",
      "narrative emission suppressed by active safeguarding route",
    );
  }
  // Reflections do not require external lineage parents (the athlete's own
  // act of reflection is the antecedent); revocation still flows through
  // revokes_event_id below.
  const parents = full.revokes_event_id
    ? [full.revokes_event_id, ...full.lineage_parent_ids]
    : full.lineage_parent_ids;
  return emitNarrative(
    ctx,
    NARRATIVE_TOPICS.identity_reflection,
    full,
    parents,
  );
}

export async function emitContextRecall(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof ContextRecallPayload>>,
  gate: NarrativeEmitGate,
): Promise<string> {
  const full = withEnvelope(payload);
  ContextRecallPayload.parse(full);
  assertEmissionLegal(gate, full.lineage_parent_ids);
  return emitNarrative(
    ctx,
    NARRATIVE_TOPICS.context_recall,
    full,
    full.lineage_parent_ids,
  );
}
