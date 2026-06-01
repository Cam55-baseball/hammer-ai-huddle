/**
 * Phase D §2 — Safeguarding delivery orchestrator.
 *
 * Pure orchestrator over `classifySafeguardingSignal`. Maps a classification
 * to a transport target. NEVER mutates organism truth, never escalates
 * permissions, never authors authority. Notifications are alerts only.
 *
 * Side-effect transports (DB insert, email) are injected — the orchestrator
 * itself is deterministic so it can be unit-tested without I/O.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  classifySafeguardingSignal,
  type SafeguardingClassification,
  type SafeguardingRoute,
} from "./safeguardingRoute";

export type DeliveryTarget =
  | "parent_notification"
  | "internal_admin"
  | "local_ui_lockdown"
  | "noop";

export interface DeliveryDecision {
  target: DeliveryTarget;
  classification: SafeguardingClassification;
  /** Plain-language line shown on the Safety Center timeline. */
  copy: string;
  /** Stable dedupe key: source_event_id + route. */
  dedupeKey: string;
}

export function decideDelivery(
  row: AsbEventRow,
  ctx: { is_minor: boolean },
): DeliveryDecision {
  const c = classifySafeguardingSignal(row, ctx);
  return {
    target: targetFor(c.route),
    classification: c,
    copy: copyFor(c.route),
    dedupeKey: `${c.source_event_id}::${c.route}`,
  };
}

function targetFor(route: SafeguardingRoute): DeliveryTarget {
  switch (route) {
    case "notify_parent":
      return "parent_notification";
    case "arbitration_required":
      return "internal_admin";
    case "lockdown_commercial":
      return "local_ui_lockdown";
    case "none":
    default:
      return "noop";
  }
}

function copyFor(route: SafeguardingRoute): string {
  switch (route) {
    case "notify_parent":
      return "A check-in may be helpful.";
    case "arbitration_required":
      return "Review recommended.";
    case "lockdown_commercial":
      return "External contact paused for now.";
    case "none":
    default:
      return "";
  }
}

/**
 * Project a stream of rows into a deterministic set of delivery decisions,
 * deduped by (source_event_id, route). Replay rebuild from the same row
 * prefix → identical set.
 */
export function projectDeliveries(
  rows: AsbEventRow[],
  ctx: { is_minor: boolean },
): DeliveryDecision[] {
  const seen = new Set<string>();
  const out: DeliveryDecision[] = [];
  for (const r of rows) {
    const d = decideDelivery(r, ctx);
    if (d.target === "noop") continue;
    if (seen.has(d.dedupeKey)) continue;
    seen.add(d.dedupeKey);
    out.push(d);
  }
  return out;
}
