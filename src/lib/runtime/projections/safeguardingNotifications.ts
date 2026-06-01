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
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { projectDeliveries, type DeliveryDecision } from "@/lib/runtime/relational/safeguardingDelivery";

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

const PREFIXES: string[] = []; // accepts the full relational stream

/** Build the safety state from a row prefix + a status snapshot. */
export const buildSafetyState = memoize<SafetyState, { is_minor: boolean; statusRows: SafeguardingStatusRow[] }>(
  (rows, { is_minor, statusRows }) => {
    const deliveries = projectDeliveries(rows, { is_minor });
    // Latest status wins per (source_event_id, route).
    const statusByKey = new Map<string, SafetyStatus>();
    for (const s of statusRows) {
      statusByKey.set(`${s.source_event_id}::${s.route}`, s.status);
    }
    const occurredByEvent = new Map<string, string>();
    for (const r of rows) occurredByEvent.set(r.event_id, r.occurred_at ?? "");

    const notifications: SafetyNotificationView[] = deliveries.map((d) => ({
      id: d.dedupeKey,
      source_event_id: d.classification.source_event_id,
      route: d.classification.route,
      status: statusByKey.get(d.dedupeKey) ?? "pending",
      copy: d.copy,
      reasons: d.classification.reasons,
      occurred_at: occurredByEvent.get(d.classification.source_event_id) ?? null,
    }));
    return { notifications };
  },
);

export function safetyState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
  opts: { is_minor: boolean; statusRows: SafeguardingStatusRow[] },
) {
  return buildSafetyState(rows, scope, PREFIXES, opts);
}
