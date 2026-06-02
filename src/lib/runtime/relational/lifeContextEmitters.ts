/**
 * RR-8 — canonical emit wrappers for relational.life_context.*
 *
 * Goes through emitAsbEvent / emitAsbLineage only. No parallel storage.
 * No mutable life-context tables. Disclosures are replay-derived overlays.
 *
 * Constitutional guarantees enforced at the emit boundary:
 *   • Authority must be self or parent (RR-8 invariants 1, 9).
 *   • coach / recruiter / clinician / system_inferred actor roles cannot
 *     author life-context events.
 *   • For minors, coach visibility requires parent authority binding.
 *   • Safeguarding lockdown reroutes: visibility narrows to `parent` and
 *     `safeguarding_category` is forced true (invariant 8).
 *   • Never emit composite/derived scores — schema disallows them.
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
import {
  RELATIONAL_REASONING_VERSION,
  type RelationalEmitContext,
} from "./emit";
import {
  LIFE_CONTEXT_TOPICS,
  AcademicLoadPayload,
  ScheduleStressPayload,
  SleepDisruptionPayload,
  TravelLoadPayload,
  FamilyContextPayload,
  GeneralPressurePayload,
  DisclosureRevocationPayload,
  type LifeContextCategory,
} from "./lifeContextSchemas";
import type { z } from "zod";

export class LifeContextEmissionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "LifeContextEmissionError";
  }
}

export interface LifeContextEmitGate {
  safeguardingLockdown: boolean;
  isMinor: boolean;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

type LifeContextEnvelopeLike = {
  visibility_scope: string;
  authority: string;
  safeguarding_category?: boolean;
  lineage_parent_ids: string[];
  engine_version: string;
  reasoning_version: string;
} & Record<string, unknown>;

function withEnvelope<P extends Record<string, unknown>>(
  p: P,
): LifeContextEnvelopeLike {
  return {
    ...(p as Record<string, unknown>),
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  } as LifeContextEnvelopeLike;
}

/**
 * Pre-emission constitutional checks (RR-8 invariants 1, 8, 9 + RR-10).
 * Returns a (possibly rerouted) payload to emit with.
 */
function gate(
  ctx: RelationalEmitContext,
  payload: LifeContextEnvelopeLike,
  gateInput: LifeContextEmitGate,
): LifeContextEnvelopeLike {
  if (
    ctx.actorRole !== "athlete" &&
    ctx.actorRole !== "parent" &&
    ctx.actorRole !== "system"
  ) {
    throw new LifeContextEmissionError(
      "ILLEGAL_ACTOR_ROLE",
      `life-context actor must be athlete or parent (got '${ctx.actorRole}') — RR-8 invariants 1, 9`,
    );
  }
  if (ctx.actorRole === "parent" && payload.authority !== "parent") {
    throw new LifeContextEmissionError(
      "AUTHORITY_ACTOR_MISMATCH",
      "parent actor must author with authority='parent'",
    );
  }
  if (ctx.actorRole === "athlete" && payload.authority !== "self") {
    throw new LifeContextEmissionError(
      "AUTHORITY_ACTOR_MISMATCH",
      "athlete actor must author with authority='self'",
    );
  }
  if (
    gateInput.isMinor &&
    payload.visibility_scope === "coach" &&
    payload.authority !== "parent"
  ) {
    throw new LifeContextEmissionError(
      "MINOR_COACH_VISIBILITY_REQUIRES_PARENT",
      "for minors, coach-visible life-context disclosure requires parent authority",
    );
  }
  if (gateInput.safeguardingLockdown) {
    return {
      ...payload,
      visibility_scope: "parent",
      safeguarding_category: true,
    };
  }
  return payload;
}

async function emitLifeContext(
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
      derivation_type: "life_context_overlay",
      engine_version: ENGINE_VERSION,
    });
  }
  return eventId;
}

type Strip<T> = Omit<T, "engine_version" | "reasoning_version">;

const CATEGORY_SCHEMA = {
  academic_load: AcademicLoadPayload,
  schedule_stress: ScheduleStressPayload,
  sleep_disruption: SleepDisruptionPayload,
  travel_load: TravelLoadPayload,
  family_context: FamilyContextPayload,
  general_pressure: GeneralPressurePayload,
} as const;

const CATEGORY_TOPIC: Record<LifeContextCategory, string> = {
  academic_load: LIFE_CONTEXT_TOPICS.academic_load,
  schedule_stress: LIFE_CONTEXT_TOPICS.schedule_stress,
  sleep_disruption: LIFE_CONTEXT_TOPICS.sleep_disruption,
  travel_load: LIFE_CONTEXT_TOPICS.travel_load,
  family_context: LIFE_CONTEXT_TOPICS.family_context,
  general_pressure: LIFE_CONTEXT_TOPICS.general_pressure,
};

/**
 * Single category emitter — all six categories share an identical
 * observational payload shape (bounded window + intensity_band +
 * optional topic_tag). `topic_id` remains distinct per category for
 * downstream observability + filtering.
 */
export async function emitLifeContextDisclosure(
  ctx: RelationalEmitContext,
  category: LifeContextCategory,
  payload: Strip<z.infer<typeof AcademicLoadPayload>>,
  gateInput: LifeContextEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  CATEGORY_SCHEMA[category].parse(full);
  const routed = gate(ctx, full, gateInput);
  return emitLifeContext(
    ctx,
    CATEGORY_TOPIC[category],
    routed,
    routed.lineage_parent_ids ?? [],
  );
}

/**
 * Revocation — removes downstream visibility on next rebuild (RR-8
 * invariant 2). The revoked event id is added to lineage so the
 * projection can trace it.
 */
export async function emitLifeContextRevocation(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof DisclosureRevocationPayload>>,
  gateInput: LifeContextEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  DisclosureRevocationPayload.parse(full);
  const routed = gate(ctx, full, gateInput);
  const revokes = (routed as unknown as { revokes_event_id: string }).revokes_event_id;
  const parents = [revokes, ...(routed.lineage_parent_ids ?? [])];
  return emitLifeContext(
    ctx,
    LIFE_CONTEXT_TOPICS.disclosure_revocation,
    routed,
    parents,
  );
}
