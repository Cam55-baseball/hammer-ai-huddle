/**
 * Phase 152 — derived trust projection.
 *
 * Trust is NEVER stored as a scalar — it is derived per (athlete, counterparty)
 * from conversation turn trust_deltas. No transitive trust. Trust never
 * authorizes — it only affords UI surfaces.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export interface CounterpartyTrust {
  counterparty_id: string;
  trust_score: number;
  contribution_count: number;
  last_event_id: string | null;
}

export interface TrustState {
  byCounterparty: Record<string, CounterpartyTrust>;
}

const PREFIXES = ["relational.conversation.", "relational.relationship."];

/** Per-counterparty rate ceiling — beyond which deltas are discarded as suspect. */
const PER_COUNTERPARTY_DELTA_CEILING = 50 as const;

function clamp(v: number): number {
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

export const buildTrustState = memoize<TrustState>((rows) => {
  const map: Record<string, CounterpartyTrust> = {};
  const redactedTurnIds = new Set<string>();

  for (const r of rows) {
    if (r.topic_id === "relational.conversation.redacted") {
      const p = r.payload as { turn_ids?: string[] };
      for (const id of p?.turn_ids ?? []) redactedTurnIds.add(id);
    }
  }

  for (const r of rows) {
    const p = r.payload as Record<string, unknown> | undefined;
    if (!p) continue;
    if (r.topic_id !== "relational.conversation.turn") continue;
    if (redactedTurnIds.has(r.event_id)) continue;
    const cp = (p.counterparty_id as string | null) ?? null;
    if (!cp) continue;
    const delta = (p.trust_delta as number) ?? 0;
    const cur =
      map[cp] ??
      {
        counterparty_id: cp,
        trust_score: 0,
        contribution_count: 0,
        last_event_id: null,
      };
    if (cur.contribution_count >= PER_COUNTERPARTY_DELTA_CEILING) {
      // Suspect burst — discard delta (would emit relational.trust.suspect
      // through the emit pathway; projection just refuses contribution).
      cur.last_event_id = r.event_id;
      map[cp] = cur;
      continue;
    }
    cur.trust_score = clamp(cur.trust_score + delta);
    cur.contribution_count += 1;
    cur.last_event_id = r.event_id;
    map[cp] = cur;
  }

  return { byCounterparty: map };
});

export function trustState(rows: AsbEventRow[] | undefined, scope: Scope) {
  return buildTrustState(rows, scope, PREFIXES);
}
