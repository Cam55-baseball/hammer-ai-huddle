/**
 * RR-4 — parent invite / acceptance / revocation orchestration.
 *
 * Pure functions over the canonical emit path. No parallel state.
 * Token format: opaque base64url JSON of {relationship_id, athlete_id, issued_at}.
 * Replay derives all linkage state from the canonical event stream — the token
 * exists only to convey the relationship_id from athlete to parent.
 */
import {
  emitRelationshipCreated,
  emitRelationshipConfirmed,
  emitRelationshipRevoked,
  type RelationshipEmitContext,
} from "./relationshipEmitters";

export interface ParentInviteToken {
  relationship_id: string;
  athlete_id: string;
  issued_at: string;
}

function base64urlEncode(s: string): string {
  // Browser + node compatible (no Buffer dep).
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(s)))
      : // eslint-disable-next-line @typescript-eslint/no-require-imports
        (Buffer as unknown as { from: (s: string, e: string) => { toString: (e: string) => string } })
          .from(s, "utf8")
          .toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((s.length + 3) % 4);
  if (typeof atob !== "undefined") {
    return decodeURIComponent(escape(atob(b64)));
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (Buffer as unknown as { from: (s: string, e: string) => { toString: (e: string) => string } })
    .from(b64, "base64")
    .toString("utf8");
}

export function encodeInviteToken(t: ParentInviteToken): string {
  return base64urlEncode(JSON.stringify(t));
}

export function decodeInviteToken(token: string): ParentInviteToken | null {
  try {
    const obj = JSON.parse(base64urlDecode(token));
    if (
      typeof obj?.relationship_id === "string" &&
      typeof obj?.athlete_id === "string" &&
      typeof obj?.issued_at === "string"
    ) {
      return obj as ParentInviteToken;
    }
    return null;
  } catch {
    return null;
  }
}

function newRelationshipId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `rel_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * Athlete-side: propose a parent relationship. Returns the relationship_id,
 * the originating event_id, and a shareable opaque token.
 */
export async function createParentInvite(input: {
  athleteId: string;
  /**
   * Optional parent user id — only known when the parent already has an
   * account. Null means "to be filled at acceptance".
   */
  parentUserId?: string | null;
  occurredAt?: string;
}): Promise<{
  relationship_id: string;
  created_event_id: string;
  token: string;
}> {
  const relationshipId = newRelationshipId();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const ctx: RelationshipEmitContext = {
    athleteId: input.athleteId,
    actorId: input.athleteId,
    actorRole: "athlete",
    occurredAt,
  };
  const eventId = await emitRelationshipCreated(ctx, {
    visibility_scope: "parent",
    confidence: 1,
    missingness: { fields: [], reason: "not_observed" },
    authority: "self",
    lineage_parent_ids: [],
    relationship_id: relationshipId,
    subject_user_id: input.athleteId,
    counterparty_user_id: input.parentUserId ?? null,
    relationship_type: "parent",
    initiated_by: "self",
    consent_required: true,
  });
  const token = encodeInviteToken({
    relationship_id: relationshipId,
    athlete_id: input.athleteId,
    issued_at: occurredAt,
  });
  return { relationship_id: relationshipId, created_event_id: eventId, token };
}

/**
 * Parent-side: accept an invite token. Emits relationship.confirmed with
 * lineage back to the originating created event. Idempotent at the emit
 * boundary via the canonical idempotency key.
 *
 * The caller must supply the `createdEventId` resolved from the timeline
 * (replay-derived). If unknown, pass the relationship_id as a stable
 * lineage anchor — the projection still treats the confirmation as
 * authoritative on the relationship_id, and the lineage edge writer is
 * additive.
 */
export async function acceptParentInvite(input: {
  token: string;
  parentUserId: string;
  createdEventId: string;
  occurredAt?: string;
}): Promise<{ confirmed_event_id: string; relationship_id: string }> {
  const decoded = decodeInviteToken(input.token);
  if (!decoded) throw new Error("INVALID_INVITE_TOKEN");
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const ctx: RelationshipEmitContext = {
    athleteId: decoded.athlete_id,
    actorId: input.parentUserId,
    actorRole: "parent",
    occurredAt,
  };
  const eventId = await emitRelationshipConfirmed(ctx, {
    visibility_scope: "parent",
    confidence: 1,
    missingness: { fields: [], reason: "not_observed" },
    authority: "parent",
    lineage_parent_ids: [input.createdEventId],
    relationship_id: decoded.relationship_id,
    confirmed_by: "parent",
    confirmation_method: "invite_token",
  });
  return {
    confirmed_event_id: eventId,
    relationship_id: decoded.relationship_id,
  };
}

/**
 * Either-side: revoke an existing relationship. Terminal — the projection
 * cannot un-revoke.
 */
export async function revokeParentRelationship(input: {
  athleteId: string;
  relationshipId: string;
  createdEventId: string;
  revokedBy: "self" | "parent" | "system_inferred";
  revokedByUserId: string | null;
  reason: "subject_request" | "counterparty_request" | "safeguarding" | "expired" | "system";
  occurredAt?: string;
}): Promise<string> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const ctx: RelationshipEmitContext = {
    athleteId: input.athleteId,
    actorId: input.revokedByUserId,
    actorRole: input.revokedBy === "parent" ? "parent" : "athlete",
    occurredAt,
  };
  return emitRelationshipRevoked(ctx, {
    visibility_scope: "parent",
    confidence: 1,
    missingness: { fields: [], reason: "not_observed" },
    authority: input.revokedBy,
    lineage_parent_ids: [input.createdEventId],
    relationship_id: input.relationshipId,
    revoked_by: input.revokedBy,
    reason: input.reason,
  });
}
