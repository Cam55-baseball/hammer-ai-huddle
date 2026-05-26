/**
 * Wave 2 — Resumable replay orchestrator.
 *
 * Strategy:
 *   1. Load checkpoint for (athleteId, lastEventId).
 *   2. If found and inputsHash matches the event-ID set, return it.
 *   3. Otherwise invalidate, call the pure builder to recompute, persist.
 *
 * No in-place mutation of projections. Recovery is replay-derived.
 */
import {
  checkpointKey,
  invalidateCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type ProjectionCheckpoint,
} from "./checkpoints";
import { hashInputs, isCorrupt } from "./corruptionGuard";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";

export interface ReplayBuildInput<E, P> {
  athleteId: string;
  events: E[];
  /** Pure builder. Same inputs MUST yield same projection (replay law). */
  build: (events: E[]) => P;
  /** Extract event_id from each input event. */
  eventId: (e: E) => string;
}

export async function resumableProjection<E, P>(
  input: ReplayBuildInput<E, P>,
): Promise<{ projection: P; fromCheckpoint: boolean }> {
  const ids = input.events.map(input.eventId);
  const lastEventId = ids[ids.length - 1] ?? "empty";
  const key = checkpointKey(input.athleteId, lastEventId);
  const cp = await loadCheckpoint<P>(key);
  if (cp && !isCorrupt(cp.inputsHash, ids)) {
    return { projection: cp.projection, fromCheckpoint: true };
  }
  if (cp) await invalidateCheckpoint(key);

  const projection = input.build(input.events);
  const next: ProjectionCheckpoint<P> = {
    key,
    athleteId: input.athleteId,
    lastEventId,
    engineVersion: ENGINE_VERSION,
    inputsHash: hashInputs(ids),
    projection,
    createdAt: Date.now(),
  };
  await saveCheckpoint(next).catch(() => undefined);
  return { projection, fromCheckpoint: false };
}
