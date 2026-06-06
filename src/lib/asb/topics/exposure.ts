/**
 * RR-9 exposure topic emitters.
 *
 * Thin wrappers around `emitAsbEvent` for relational.exposure.* events.
 * These events are interpretive lineage only — they never author
 * organism_truth / athlete_intent / authority_override / hard_stop /
 * rehabilitation_state per Megaphase 151–160 doctrine.
 */
import { emitAsbEvent } from "@/lib/asb/emit";

const ENGINE_VERSION = "rr9-1.0.0";

type ConsentActorRole = "athlete" | "parent";
type ConsentChangeType = "grant" | "revoke" | "toggle";

interface ConsentChangeInput {
  athleteId: string;
  actorId: string;
  actorRole?: ConsentActorRole;
  changeType?: ConsentChangeType;
  previous: { visibility_enabled: boolean; parent_authorized: boolean } | null;
  next: { visibility_enabled: boolean; parent_authorized: boolean };
}

export async function emitExposureConsentChanged(input: ConsentChangeInput) {
  const event_id = crypto.randomUUID();
  const now = new Date().toISOString();
  const actorRole: ConsentActorRole = input.actorRole ?? "athlete";
  await emitAsbEvent({
    event_id,
    athlete_id: input.athleteId,
    topic_id: "relational.exposure.consent_changed",
    actor_role: actorRole,
    actor_id: input.actorId,
    occurred_at: now,
    ingested_at: now,
    effective_at: now,
    valid_from: now,
    payload: {
      previous: input.previous,
      next: input.next,
      actor_role: actorRole,
      change_type: input.changeType ?? "toggle",
      engine_version: ENGINE_VERSION,
    },
    engine_version: ENGINE_VERSION,
    idempotency_key: `rr9.consent_changed.${input.athleteId}.${event_id}`,
    causality_refs: [],
    lineage_refs: [],
  });
}

interface GateBlockedInput {
  athleteId: string;
  viewerId: string | null;
  reason:
    | "visibility_disabled"
    | "minor_without_parent_authorization"
    | "consent_missing"
    | "unauthenticated";
}

export async function emitExposureGateBlocked(input: GateBlockedInput) {
  const event_id = crypto.randomUUID();
  const now = new Date().toISOString();
  await emitAsbEvent({
    event_id,
    athlete_id: input.athleteId,
    topic_id: "relational.exposure.gate_blocked",
    actor_role: "system",
    actor_id: input.viewerId,
    occurred_at: now,
    ingested_at: now,
    effective_at: now,
    valid_from: now,
    payload: {
      reason: input.reason,
      viewer_id: input.viewerId,
      engine_version: ENGINE_VERSION,
    },
    engine_version: ENGINE_VERSION,
    idempotency_key: `rr9.gate_blocked.${input.athleteId}.${event_id}`,
    causality_refs: [],
    lineage_refs: [],
  });
}
