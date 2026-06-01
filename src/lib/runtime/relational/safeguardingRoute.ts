/**
 * RR-4 §5 — Safeguarding route foundation.
 *
 * PURE deterministic classifier. No notification delivery, no external
 * integration, no state mutation, no I/O. Establishes the constitutional
 * sub-route per Megaphase 151–160 §safeguarding (signal → classify →
 * contain → notify_safeguarding_role → survivability_lockdown → arbitrate).
 *
 * This file implements only the classify step. The notify and lockdown
 * stages will be wired in a later phase under Phase 31 arbitration.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { PSYCH_BANDS } from "./schemas";

export type SafeguardingRoute =
  | "notify_parent"
  | "lockdown_commercial"
  | "arbitration_required"
  | "none";

export interface SafeguardingClassification {
  route: SafeguardingRoute;
  reasons: string[];
  /** Event that triggered classification, for lineage propagation. */
  source_event_id: string;
}

const CRISIS_BANDS = new Set<string>(["crisis", "strained"]);

function isCrisisPsych(row: AsbEventRow): string[] {
  const p = row.payload as Record<string, unknown> | undefined;
  if (!p) return [];
  const reasons: string[] = [];
  if (row.topic_id === "relational.psych.self_report") {
    const value = p.value as number | undefined;
    if (typeof value === "number" && value <= -1.5) {
      reasons.push("psych_self_report_low_value");
    }
  }
  if (row.topic_id === "relational.psych.transition") {
    const to = p.to_band as string | undefined;
    if (to && CRISIS_BANDS.has(to) && PSYCH_BANDS.includes(to as never)) {
      reasons.push(`psych_transition_to_${to}`);
    }
  }
  return reasons;
}

/**
 * Classify a single canonical event. The classifier is pure and deterministic:
 * identical inputs → identical output at pinned engine_version.
 *
 * Required context:
 *  - is_minor: derived from the developmental projection.
 *  - is_commercial_scope: payload visibility_scope === "external"
 *    (sponsorship / NIL / recruiting surfaces are not yet active).
 *  - explicit_safeguarding_flag: payload.safeguarding_category === true.
 */
export function classifySafeguardingSignal(
  row: AsbEventRow,
  ctx: { is_minor: boolean },
): SafeguardingClassification {
  const reasons: string[] = [];
  const p = (row.payload ?? {}) as Record<string, unknown>;
  const explicit = p.safeguarding_category === true;
  const visibilityScope = p.visibility_scope as string | undefined;
  const isCommercial = visibilityScope === "external";

  const psychReasons = isCrisisPsych(row);
  reasons.push(...psychReasons);
  if (explicit) reasons.push("explicit_safeguarding_flag");
  if (isCommercial && ctx.is_minor) reasons.push("minor_in_commercial_scope");

  let route: SafeguardingRoute = "none";

  if (reasons.length === 0) {
    route = "none";
  } else if (explicit && psychReasons.length > 0) {
    // Multiple co-occurring signals → arbitration.
    route = "arbitration_required";
  } else if (psychReasons.length > 0 && ctx.is_minor) {
    route = "notify_parent";
  } else if (psychReasons.length > 0) {
    // Adult psych signal — still routes to arbitration for human review.
    route = "arbitration_required";
  } else if (isCommercial && ctx.is_minor) {
    route = "lockdown_commercial";
  } else if (explicit) {
    route = "arbitration_required";
  }

  return { route, reasons, source_event_id: row.event_id };
}
