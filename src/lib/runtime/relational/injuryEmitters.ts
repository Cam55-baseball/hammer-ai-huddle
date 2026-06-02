/**
 * RR-6 Wave 1 — canonical emit wrappers for relational.injury.*
 *
 * Goes through emitAsbEvent / emitAsbLineage only. No parallel storage,
 * no mutable recovery tables, no in-memory cached recovery state.
 *
 * Constitutional gates enforced at the emit boundary:
 *   1. Recruiter / commercial / AI actors blocked entirely (RR-6 inv 4, 8).
 *   2. Coach cannot author rtp_authorized (RR-6 invariant 5).
 *   3. Under safeguarding lockdown, visibility narrows to "parent" and
 *      safeguarding_category is forced true (RR-6 invariant 9 / RR-8 inv 8).
 *   4. Full Zod schema validation runs before emission.
 *   5. Lineage parent ids preserved; revocation/update events carry the
 *      referenced event id as a lineage parent so the projection traces it.
 *   6. Diagnostic / prognostic / treatment language rejected via denylist
 *      (RR-6 invariants 1, 2 — see INJURY_RECOVERY_VOICE.denylist).
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
  INJURY_TOPICS,
  InjuryReportedPayload,
  InjuryUpdatedPayload,
  InjuryRecoveryCheckpointPayload,
  InjuryRtpAuthorizedPayload,
  InjuryVisibilityRevokedPayload,
} from "./injurySchemas";
import { INJURY_RECOVERY_VOICE } from "@/lib/relational/copy";
import type { z } from "zod";

export class InjuryEmissionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "InjuryEmissionError";
  }
}

export interface InjuryEmitGate {
  safeguardingLockdown: boolean;
  isMinor: boolean;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

type EnvelopeLike = {
  visibility_scope: string;
  authority: string;
  safeguarding_category?: boolean;
  lineage_parent_ids: string[];
  engine_version: string;
  reasoning_version: string;
} & Record<string, unknown>;

function withEnvelope<P extends Record<string, unknown>>(p: P): EnvelopeLike {
  return {
    ...(p as Record<string, unknown>),
    engine_version: ENGINE_VERSION,
    reasoning_version: RELATIONAL_REASONING_VERSION,
  } as EnvelopeLike;
}

const ALLOWED_ACTOR_ROLES = new Set<AsbEmitRow["actor_role"]>([
  "athlete",
  "parent",
  "medical",
  "system",
]);

function scanDenylist(p: EnvelopeLike): void {
  const haystacks: string[] = [];
  for (const key of ["recovery_focus", "body_region", "topic_tag"]) {
    const v = (p as Record<string, unknown>)[key];
    if (typeof v === "string") haystacks.push(v.toLowerCase());
  }
  for (const text of haystacks) {
    for (const token of INJURY_RECOVERY_VOICE.denylist) {
      if (text.includes(token)) {
        throw new InjuryEmissionError(
          "INJURY_DENYLIST_HIT",
          `injury payload contains forbidden term '${token}' (RR-6 invariants 1, 2)`,
        );
      }
    }
  }
}

function gate(
  ctx: RelationalEmitContext,
  payload: EnvelopeLike,
  gateInput: InjuryEmitGate,
  opts: { isRtp: boolean },
): EnvelopeLike {
  if (!ALLOWED_ACTOR_ROLES.has(ctx.actorRole)) {
    throw new InjuryEmissionError(
      "ILLEGAL_ACTOR_ROLE",
      `injury actor must be athlete/parent/medical/system (got '${ctx.actorRole}') — RR-6 invariants 4, 8`,
    );
  }
  if (ctx.actorRole === "ai") {
    // Belt-and-braces — AI actors must never reach RR-6 (RR-6 invariant 8).
    throw new InjuryEmissionError(
      "ILLEGAL_ACTOR_ROLE",
      "AI actors cannot author RR-6 events (RR-6 invariant 8)",
    );
  }
  if (opts.isRtp && ctx.actorRole === "coach") {
    throw new InjuryEmissionError(
      "COACH_CANNOT_AUTHORIZE_RTP",
      "coach actor cannot author rtp_authorized — only parent/clinician (RR-6 invariant 5)",
    );
  }
  scanDenylist(payload);
  if (gateInput.safeguardingLockdown) {
    return {
      ...payload,
      visibility_scope: "parent",
      safeguarding_category: true,
    };
  }
  return payload;
}

async function emitInjury(
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
      derivation_type: "injury_continuity_overlay",
      engine_version: ENGINE_VERSION,
    });
  }
  return eventId;
}

type Strip<T> = Omit<T, "engine_version" | "reasoning_version">;

export async function emitInjuryReported(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof InjuryReportedPayload>>,
  gateInput: InjuryEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  InjuryReportedPayload.parse(full);
  const routed = gate(ctx, full, gateInput, { isRtp: false });
  return emitInjury(
    ctx,
    INJURY_TOPICS.reported,
    routed,
    routed.lineage_parent_ids ?? [],
  );
}

export async function emitInjuryUpdated(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof InjuryUpdatedPayload>>,
  gateInput: InjuryEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  InjuryUpdatedPayload.parse(full);
  const routed = gate(ctx, full, gateInput, { isRtp: false });
  const updates = (routed as unknown as { updates_event_id: string })
    .updates_event_id;
  const parents = [updates, ...(routed.lineage_parent_ids ?? [])];
  return emitInjury(ctx, INJURY_TOPICS.updated, routed, parents);
}

export async function emitRecoveryCheckpoint(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof InjuryRecoveryCheckpointPayload>>,
  gateInput: InjuryEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  InjuryRecoveryCheckpointPayload.parse(full);
  const routed = gate(ctx, full, gateInput, { isRtp: false });
  return emitInjury(
    ctx,
    INJURY_TOPICS.recovery_checkpoint,
    routed,
    routed.lineage_parent_ids ?? [],
  );
}

export async function emitRtpAuthorized(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof InjuryRtpAuthorizedPayload>>,
  gateInput: InjuryEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  InjuryRtpAuthorizedPayload.parse(full);
  const routed = gate(ctx, full, gateInput, { isRtp: true });
  const authorizes = (routed as unknown as { authorizes_event_id: string })
    .authorizes_event_id;
  const parents = [authorizes, ...(routed.lineage_parent_ids ?? [])];
  return emitInjury(ctx, INJURY_TOPICS.rtp_authorized, routed, parents);
}

export async function emitInjuryVisibilityRevoked(
  ctx: RelationalEmitContext,
  payload: Strip<z.infer<typeof InjuryVisibilityRevokedPayload>>,
  gateInput: InjuryEmitGate,
): Promise<string> {
  const full = withEnvelope(payload as unknown as Record<string, unknown>);
  InjuryVisibilityRevokedPayload.parse(full);
  const routed = gate(ctx, full, gateInput, { isRtp: false });
  const revokes = (routed as unknown as { revokes_event_id: string })
    .revokes_event_id;
  const parents = [revokes, ...(routed.lineage_parent_ids ?? [])];
  return emitInjury(ctx, INJURY_TOPICS.visibility_revoked, routed, parents);
}
