/**
 * Wave 2 — Offline reconciler.
 *
 * On reconnect, flushes queued events through emitAsbEvent in order.
 * Dedupe is provided by the server-side unique constraint on
 * idempotency_key; we treat 23505 as success (already accepted).
 */
import { emitAsbEvent } from "@/lib/asb/emit";
import {
  bumpRetry,
  listQueue,
  removeFromQueue,
  type QueuedEvent,
} from "./eventQueue";
import { ENGINE_VERSION, computeIdempotencyKey } from "@/lib/asb/engineVersion";

const MAX_RETRIES = 5;

export interface ReconcileReport {
  flushed: number;
  retained: number;
  permanentlyFailed: number;
}

async function flushOne(q: QueuedEvent): Promise<"ok" | "retry" | "drop"> {
  const occurredAt = new Date(q.enqueuedAt).toISOString();
  const idempotencyKey = await computeIdempotencyKey({
    athlete_id: q.athleteId,
    topic_id: q.topic,
    occurred_at: occurredAt,
    payload: q.payload,
  });
  try {
    await emitAsbEvent({
      event_id: q.id,
      athlete_id: q.athleteId,
      topic_id: q.topic,
      actor_role: q.actorRole as never,
      actor_id: q.actorId,
      occurred_at: occurredAt,
      ingested_at: new Date().toISOString(),
      effective_at: occurredAt,
      valid_from: occurredAt,
      payload: q.payload,
      engine_version: ENGINE_VERSION,
      idempotency_key: idempotencyKey,
      causality_refs: q.causalityRefs ?? [],
      lineage_refs: q.lineageRefs ?? [],
    });
    return "ok";
  } catch (e) {
    console.warn("[ops.reconciler] flush_failed", (e as Error)?.message);
    return q.retries + 1 >= MAX_RETRIES ? "drop" : "retry";
  }
}

export async function reconcileQueue(): Promise<ReconcileReport> {
  const report: ReconcileReport = { flushed: 0, retained: 0, permanentlyFailed: 0 };
  const queue = await listQueue();
  for (const q of queue) {
    const outcome = await flushOne(q);
    if (outcome === "ok") {
      await removeFromQueue(q.id);
      report.flushed += 1;
    } else if (outcome === "drop") {
      await removeFromQueue(q.id);
      report.permanentlyFailed += 1;
    } else {
      await bumpRetry(q.id);
      report.retained += 1;
    }
  }
  return report;
}
