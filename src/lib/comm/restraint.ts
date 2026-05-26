/**
 * Restraint: suppresses re-surfacing of notifications the athlete has already
 * acknowledged. Acknowledgement is an explicit ledger event; restraint is a
 * pure function over event history.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export function isAcknowledged(
  rows: AsbEventRow[] | undefined,
  topic: string,
  sources: string[],
): boolean {
  if (!rows) return false;
  return rows.some(
    (r) =>
      r.topic_id === "runtime.feedback.captured" &&
      (r.payload as any)?.ack_topic === topic &&
      ((r.payload as any)?.ack_sources ?? []).some((s: string) =>
        sources.includes(s),
      ),
  );
}
