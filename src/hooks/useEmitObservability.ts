/**
 * Canonical Event Emission — observability hook.
 *
 * Closes RFL-001…RFL-007 by providing a single thin wrapper that:
 *   • Builds a canonical ASB row via the standard `emitAsbEvent` fabric.
 *   • Computes a deterministic idempotency_key (athlete_id | topic | occurred_at | canonical(payload))
 *     so refresh, multi-device, and replay never double-count.
 *   • Day-buckets `occurred_at` (UTC midnight) inside the idempotency input
 *     for "viewed/opened" surfaces so same-day repeated views collapse to one canonical row,
 *     while preserving the real-time wall-clock `occurred_at` on the persisted row.
 *   • Guards in-session re-emission via `sessionStorage` to avoid pointless network round-trips.
 *   • Never throws. Never blocks render.
 *
 * Constitutional posture: interpretive observability only. Never authors
 * organism_truth / athlete_intent / authority_override / hard_stop /
 * rehabilitation_state. Subordinate to all sealed invariant families.
 */
import { useEffect, useRef } from "react";
import { emitAsbEvent, type AsbEmitRow } from "@/lib/asb/emit";
import {
  ENGINE_VERSION,
  canonicalPayload,
} from "@/lib/asb/engineVersion";

export type ObservabilityTopic =
  // Wave-1 (RFL-001…RFL-007 — sealed)
  | "athlete.lifecycle.signup"
  | "athlete.onboarding.completed"
  | "intelligence.uhrc.viewed"
  | "intelligence.hammer.viewed"
  | "intelligence.trend.viewed"
  | "coach.review.opened"
  | "recruiter.review.opened"
  // Wave-2 — Recommendation Lifecycle (RFL-008/009/010)
  | "foundation.recommendation.shown"
  | "foundation.recommendation.opened"
  | "foundation.recommendation.completed"
  | "foundation.recommendation.coach_ack"
  | "foundation.drill.assigned"
  | "foundation.drill.started"
  | "foundation.drill.completed";

export type EmitActorRole = AsbEmitRow["actor_role"];

export interface EmitObservabilityInput {
  topic: ObservabilityTopic;
  /** Subject of the event — the athlete whose data is being viewed/produced. */
  athleteId: string;
  /** Acting user (auth.uid). For self-views == athleteId. */
  actorId: string | null;
  actorRole: EmitActorRole;
  /** Free-form payload. Stays small. Never carries PHI beyond IDs. */
  payload?: Record<string, unknown>;
  /**
   * Day-bucket the idempotency-input occurred_at to UTC midnight.
   * Defaults to true for view/open topics; set false for one-shot lifecycle topics
   * (signup / onboarding.completed) where lifetime dedupe is desired and the
   * dedupe-key omits time entirely.
   */
  dayBucket?: boolean;
  /**
   * If true, dedupe-key omits occurred_at entirely (lifetime one-shot per
   * (athlete_id, topic, payload)). Use for signup + onboarding.completed.
   */
  lifetime?: boolean;
}

function randomEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function utcMidnightIso(d: Date): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  ).toISOString();
}

async function sha256Hex(s: string): Promise<string> {
  const subtle =
    (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Should never hit in a browser context, but keep a fallback parity with engineVersion.ts.
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.createHash("sha256").update(s).digest("hex");
}

/** Build the canonical idempotency key for an observability emission. */
async function buildIdempotencyKey(input: {
  athleteId: string;
  topic: ObservabilityTopic;
  occurredAt: string;
  payload: Record<string, unknown>;
  dayBucket: boolean;
  lifetime: boolean;
}): Promise<string> {
  let timeMaterial: string;
  if (input.lifetime) {
    timeMaterial = "lifetime";
  } else if (input.dayBucket) {
    timeMaterial = utcMidnightIso(new Date(input.occurredAt));
  } else {
    timeMaterial = input.occurredAt;
  }
  const material = [
    input.athleteId,
    input.topic,
    timeMaterial,
    canonicalPayload(input.payload),
  ].join("|");
  return sha256Hex(material);
}

/**
 * Imperative single-shot emit. Safe to await; never throws.
 * Returns the event_id (newly minted or the one that would have been minted).
 */
export async function emitObservability(
  input: EmitObservabilityInput,
): Promise<string> {
  const occurredAt = new Date().toISOString();
  const dayBucket = input.dayBucket ?? !input.lifetime;
  const lifetime = input.lifetime ?? false;
  const payload = input.payload ?? {};

  const idempotencyKey = await buildIdempotencyKey({
    athleteId: input.athleteId,
    topic: input.topic,
    occurredAt,
    payload,
    dayBucket,
    lifetime,
  });

  const row: AsbEmitRow = {
    event_id: randomEventId(),
    athlete_id: input.athleteId,
    topic_id: input.topic,
    actor_role: input.actorRole,
    actor_id: input.actorId,
    occurred_at: occurredAt,
    ingested_at: occurredAt,
    effective_at: occurredAt,
    valid_from: occurredAt,
    valid_to: null,
    payload,
    engine_version: ENGINE_VERSION,
    idempotency_key: idempotencyKey,
    causality_refs: [],
    lineage_refs: [],
  };
  await emitAsbEvent(row);
  return row.event_id;
}

/**
 * Mount-time once-per-session emitter. Re-fires when `key` changes.
 * Use for surface "viewed/opened" instrumentation.
 *
 * The `key` is the in-session dedupe key (e.g. `coach.review.opened:<coachId>:<athleteId>`).
 * The server-side UNIQUE(idempotency_key) constraint provides the canonical dedupe;
 * the session guard just avoids pointless round-trips.
 */
export function useEmitOnce(
  key: string | null,
  input: EmitObservabilityInput | null,
): void {
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key || !input) return;
    if (firedRef.current === key) return;

    let storageKey: string | null = null;
    try {
      storageKey = `obs:${input.topic}:${key}`;
      if (typeof sessionStorage !== "undefined") {
        if (sessionStorage.getItem(storageKey)) {
          firedRef.current = key;
          return;
        }
      }
    } catch {
      // sessionStorage unavailable — fall through to network emit.
    }

    firedRef.current = key;
    emitObservability(input)
      .then(() => {
        try {
          if (storageKey && typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(storageKey, "1");
          }
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // emitAsbEvent never throws, but keep belt-and-suspenders.
      });
  }, [key, input]);
}
