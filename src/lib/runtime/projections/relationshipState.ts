/**
 * RR-4 — replay-derived projection of relational.relationship.* events.
 *
 * Pure, deterministic, memoized. Folds created → confirmed → revoked / paused
 * into the current relationship set per athlete. Stage of each relationship:
 *
 *   • pending   — created, not yet confirmed, not revoked
 *   • active    — created + confirmed, not revoked, not currently paused
 *   • paused    — last transition is `paused` (resume requires another event)
 *   • revoked   — any revocation event ever appended (terminal)
 *
 * Revocation is terminal and lineage-visible. There is no resurrect verb in RR-4.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  RELATIONSHIP_TOPICS,
  type RelationshipType,
} from "@/lib/runtime/relational/relationshipSchemas";

export type RelationshipStatus = "pending" | "active" | "paused" | "revoked";

export interface RelationshipRecord {
  relationship_id: string;
  subject_user_id: string;
  counterparty_user_id: string | null;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  created_event_id: string;
  last_transition_event_id: string;
  consent_required: boolean;
  revoke_reason: string | null;
  pause_reason: string | null;
  pause_resume_allowed: boolean | null;
}

export interface RelationshipState {
  byId: Record<string, RelationshipRecord>;
  /** Convenience indexes derived from byId. */
  activeParents: string[]; // counterparty_user_ids
  activeCoaches: string[];
  revokedIds: string[];
  pausedIds: string[];
}

const PREFIXES = ["relational.relationship."];

export const buildRelationshipState = memoize<RelationshipState>((rows) => {
  const byId: Record<string, RelationshipRecord> = {};

  for (const r of rows) {
    const p = r.payload as Record<string, unknown> | undefined;
    if (!p) continue;
    const relId = p.relationship_id as string | undefined;
    if (!relId) continue;

    if (r.topic_id === RELATIONSHIP_TOPICS.created) {
      // First-write-wins per relationship_id; later `created` rows with the
      // same id are constitutionally illegal but never crash the projection.
      if (byId[relId]) continue;
      byId[relId] = {
        relationship_id: relId,
        subject_user_id: (p.subject_user_id as string) ?? "",
        counterparty_user_id:
          (p.counterparty_user_id as string | null) ?? null,
        relationship_type:
          (p.relationship_type as RelationshipType) ?? "athlete_self",
        status: "pending",
        created_event_id: r.event_id,
        last_transition_event_id: r.event_id,
        consent_required: Boolean(p.consent_required ?? true),
        revoke_reason: null,
        pause_reason: null,
        pause_resume_allowed: null,
      };
      continue;
    }

    const rec = byId[relId];
    if (!rec) continue; // transition without a created event — ignored
    if (rec.status === "revoked") continue; // terminal

    if (r.topic_id === RELATIONSHIP_TOPICS.confirmed) {
      rec.status = "active";
      rec.last_transition_event_id = r.event_id;
    } else if (r.topic_id === RELATIONSHIP_TOPICS.revoked) {
      rec.status = "revoked";
      rec.revoke_reason = (p.reason as string) ?? "system";
      rec.last_transition_event_id = r.event_id;
    } else if (r.topic_id === RELATIONSHIP_TOPICS.paused) {
      rec.status = "paused";
      rec.pause_reason = (p.reason as string) ?? null;
      rec.pause_resume_allowed = Boolean(p.resume_allowed ?? false);
      rec.last_transition_event_id = r.event_id;
    }
  }

  const activeParents: string[] = [];
  const activeCoaches: string[] = [];
  const revokedIds: string[] = [];
  const pausedIds: string[] = [];

  for (const rec of Object.values(byId)) {
    if (rec.status === "revoked") revokedIds.push(rec.relationship_id);
    if (rec.status === "paused") pausedIds.push(rec.relationship_id);
    if (rec.status === "active" && rec.counterparty_user_id) {
      if (rec.relationship_type === "parent")
        activeParents.push(rec.counterparty_user_id);
      else if (rec.relationship_type === "coach")
        activeCoaches.push(rec.counterparty_user_id);
    }
  }

  return { byId, activeParents, activeCoaches, revokedIds, pausedIds };
});

export function relationshipState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildRelationshipState(rows, scope, PREFIXES);
}

// ─── Visibility arbitration over an already-scope-filtered row set ────────

/**
 * RR-4 §4 — apply relationship-driven visibility arbitration.
 *
 * Given a row set already filtered through `prepareRows(rows, scope, …)` and
 * the current relationshipState (built independently from the unscoped row
 * set or via this hook), produce the final row set a coach/parent reader is
 * authorized to see:
 *
 *  • If reader is `coach` and *any* relationship with the reader as
 *    counterparty is revoked, the coach loses visibility on rows tied to
 *    that relationship via `payload.relationship_id` (best-effort —
 *    typically rows don't carry relationship_id, in which case the
 *    relationship-level revoke is enforced upstream when the coach role
 *    is removed from the auth context).
 *  • If a relationship is `paused`, downstream payloads are downgraded to
 *    presence-only (`{ paused: true, topic_id, occurred_at }`).
 *  • Revoked parents lose all reads on their counterparty payloads.
 *
 * This function never widens visibility — it only narrows or redacts.
 */
export interface ArbitratedRow {
  event_id: string;
  topic_id: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  redacted: boolean;
}

export function applyRelationshipVisibility(
  rows: AsbEventRow[],
  readerCounterpartyId: string | null,
  state: RelationshipState,
): ArbitratedRow[] {
  const out: ArbitratedRow[] = [];
  for (const r of rows) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    const relId = p.relationship_id as string | undefined;
    let redacted = false;
    let payload: Record<string, unknown> = p;

    if (relId) {
      const rec = state.byId[relId];
      if (rec) {
        // Reader is the counterparty whose relationship was revoked → block.
        if (
          rec.status === "revoked" &&
          readerCounterpartyId &&
          rec.counterparty_user_id === readerCounterpartyId
        ) {
          continue;
        }
        // Paused relationship → presence-only.
        if (rec.status === "paused") {
          redacted = true;
          payload = { paused: true };
        }
      }
    }
    out.push({
      event_id: r.event_id,
      topic_id: r.topic_id,
      occurred_at: r.occurred_at,
      payload,
      redacted,
    });
  }
  return out;
}
