/**
 * Phase 152–154 — shared test fixtures.
 *
 * Pure builders. No Date.now / Math.random / network. Deterministic IDs.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export function mk(
  over: Partial<AsbEventRow> & {
    topic_id: string;
    event_id: string;
    occurred_at: string;
    payload: Record<string, unknown>;
  },
): AsbEventRow {
  return {
    athlete_id: "ath_test",
    actor_role: "athlete",
    actor_id: "u_test",
    ingested_at: over.occurred_at,
    effective_at: over.occurred_at,
    valid_from: over.occurred_at,
    valid_to: null,
    engine_version: "asb-1.0.0",
    idempotency_key: over.event_id,
    causality_refs: null,
    lineage_refs: null,
    ...over,
  } as AsbEventRow;
}

export const ENV = {
  engine_version: "asb-1.0.0",
  reasoning_version: "relational-1.0.0",
  missingness: { fields: [] as string[], reason: "not_observed" as const },
  lineage_parent_ids: [] as string[],
};
