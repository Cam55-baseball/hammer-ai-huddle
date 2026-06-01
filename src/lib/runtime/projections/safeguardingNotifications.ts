/**
 * Phase D §2 — Safety Center projection.
 *
 * Replay-derived list of safeguarding deliveries for a given athlete,
 * folded with status from the `safeguarding_notifications` transport
 * table. Deterministic given the same canonical event prefix + same
 * status snapshot.
 *
 * Pure module — caller fetches `safeguarding_notifications` rows and
 * passes them in alongside the canonical row set.
 */
import { prepareRows, type Scope, type ProjectionMeta, projectionKey } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { projectDeliveries } from "@/lib/runtime/relational/safeguardingDelivery";

export type SafetyStatus = "pending" | "reviewed" | "muted";

export interface SafetyNotificationView {
  id: string; // dedupe key
  source_event_id: string;
  route: string;
  status: SafetyStatus;
  copy: string;
  reasons: string[];
  occurred_at: string | null;
}

export interface SafeguardingStatusRow {
  source_event_id: string;
  route: string;
  status: SafetyStatus;
}

export interface SafetyState {
  notifications: SafetyNotificationView[];
}

// Accept the full relational stream — safeguarding can fire on any prefix
// (psych, exposure, conversation). We use the broad prefix.
const PREFIXES = ["relational."];

export function safetyState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
  opts: { is_minor: boolean; statusRows: SafeguardingStatusRow[] },
): { state: SafetyState; meta: ProjectionMeta } {
  const prepared = prepareRows(rows, scope, PREFIXES);
  const last = prepared.length > 0 ? (prepared[prepared.length - 1].event_id ?? null) : null;
  const deliveries = projectDeliveries(prepared, { is_minor: opts.is_minor });

  const statusByKey = new Map<string, SafetyStatus>();
  for (const s of opts.statusRows) {
    statusByKey.set(`${s.source_event_id}::${s.route}`, s.status);
  }
  const occurredByEvent = new Map<string, string>();
  for (const r of prepared) occurredByEvent.set(r.event_id, r.occurred_at ?? "");

  const notifications: SafetyNotificationView[] = deliveries.map((d) => ({
    id: d.dedupeKey,
    source_event_id: d.classification.source_event_id,
    route: d.classification.route,
    status: statusByKey.get(d.dedupeKey) ?? "pending",
    copy: d.copy,
    reasons: d.classification.reasons,
    occurred_at: occurredByEvent.get(d.classification.source_event_id) ?? null,
  }));

  return {
    state: Object.freeze({ notifications }) as SafetyState,
    meta: {
      lastEventId: last,
      sourceCount: prepared.length,
      scope,
    },
  };
}

// Re-export for parity with other projection modules.
export { projectionKey };
