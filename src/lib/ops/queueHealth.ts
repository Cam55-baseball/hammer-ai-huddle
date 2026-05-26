/**
 * Wave 2 — Offline queue derived health.
 *
 * Pure reducer over the IndexedDB outbox (see runtime/offline/eventQueue).
 * Never mutates queue entries.
 */
import type { QueuedEvent } from "@/lib/runtime/offline/eventQueue";

export interface QueueHealthSnapshot {
  size: number;
  oldestAgeMs: number | null;
  newestAgeMs: number | null;
  retryHistogram: Record<number, number>;
  pendingByTopic: Array<{ topic: string; count: number }>;
}

export function buildQueueHealth(
  queued: QueuedEvent[],
  now: number = Date.now(),
): QueueHealthSnapshot {
  if (!queued.length) {
    return {
      size: 0,
      oldestAgeMs: null,
      newestAgeMs: null,
      retryHistogram: {},
      pendingByTopic: [],
    };
  }
  const times = queued.map((q) => q.enqueuedAt);
  const oldest = Math.min(...times);
  const newest = Math.max(...times);
  const retryHistogram: Record<number, number> = {};
  const topicCounts = new Map<string, number>();
  for (const q of queued) {
    retryHistogram[q.retries] = (retryHistogram[q.retries] ?? 0) + 1;
    topicCounts.set(q.topic, (topicCounts.get(q.topic) ?? 0) + 1);
  }
  return {
    size: queued.length,
    oldestAgeMs: now - oldest,
    newestAgeMs: now - newest,
    retryHistogram,
    pendingByTopic: [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
  };
}
