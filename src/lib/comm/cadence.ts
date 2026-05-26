/**
 * Wave 3 — Communication cadence governor.
 *
 * Single chokepoint for non-critical notifications. Critical survivability
 * events (illness severe, RTP restriction, hard_stop) bypass the ceiling.
 * Drops emit a `comm.notification_dropped` event for observability — they are
 * never silently deferred.
 */
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";

export type Severity = "critical" | "info";

export interface NotifyInput {
  athleteId: string;
  actorId: string | null;
  topic: string; // domain.topic — informational only
  severity: Severity;
  message: string;
  /** Lineage refs for replay. */
  sources?: string[];
}

const DAILY_CEILING_NON_CRITICAL = 2;

/** Per-process in-memory counter — process-bounded by design (no hidden state). */
const counts = new Map<string, { day: string; count: number }>();

function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function _resetCadenceForTests() {
  counts.clear();
}

export async function notify(input: NotifyInput): Promise<"sent" | "dropped"> {
  const key = `${input.athleteId}`;
  const today = todayKey();
  const slot = counts.get(key);
  if (!slot || slot.day !== today) {
    counts.set(key, { day: today, count: 0 });
  }
  const cur = counts.get(key)!;

  if (input.severity !== "critical" && cur.count >= DAILY_CEILING_NON_CRITICAL) {
    // Replay-visible drop. Critical-survivability events never enter this branch.
    await emitRuntimeEvent({
      athleteId: input.athleteId,
      actorId: input.actorId,
      actorRole: "system",
      topic: "comm.notification_sent" as any, // dropped → still emitted with payload.dropped=true
      payload: {
        topic: input.topic,
        severity: input.severity,
        dropped: true,
        reason: "daily_ceiling_exceeded",
        message: input.message,
      },
      lineageRefs: input.sources ?? [],
    });
    return "dropped";
  }

  cur.count += 1;
  await emitRuntimeEvent({
    athleteId: input.athleteId,
    actorId: input.actorId,
    actorRole: "system",
    topic: "comm.notification_sent" as any,
    payload: {
      topic: input.topic,
      severity: input.severity,
      dropped: false,
      message: input.message,
    },
    lineageRefs: input.sources ?? [],
  });
  return "sent";
}
