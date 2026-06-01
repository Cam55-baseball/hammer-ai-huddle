/**
 * RR-4 — relational.relationship.* payload schemas.
 *
 * Constitutional envelope shared with all relational primitives. Additive-only;
 * no mutable relationship table; every transition is lineage-bound.
 *
 * Pure module. No I/O. No Date.now / Math.random. Replay-safe.
 */
import { z } from "zod";
import {
  RelationalEnvelope,
  RELATIONAL_AUTHORITY,
  VISIBILITY_SCOPES,
} from "./schemas";

export const RELATIONSHIP_TYPES = ["parent", "coach", "athlete_self"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TOPICS = {
  created: "relational.relationship.created",
  confirmed: "relational.relationship.confirmed",
  revoked: "relational.relationship.revoked",
  paused: "relational.relationship.paused",
} as const;

export type RelationshipTopic =
  (typeof RELATIONSHIP_TOPICS)[keyof typeof RELATIONSHIP_TOPICS];

// ─── created ───────────────────────────────────────────────────────────────

export const RelationshipCreatedPayload = RelationalEnvelope.extend({
  relationship_id: z.string().min(1),
  subject_user_id: z.string().min(1),
  counterparty_user_id: z.string().min(1).nullable(),
  relationship_type: z.enum(RELATIONSHIP_TYPES),
  initiated_by: z.enum(RELATIONAL_AUTHORITY),
  consent_required: z.boolean(),
});
export type RelationshipCreatedPayload = z.infer<
  typeof RelationshipCreatedPayload
>;

// ─── confirmed ─────────────────────────────────────────────────────────────

export const CONFIRMATION_METHODS = [
  "invite_token",
  "in_app_accept",
  "verified_doc",
  "system",
] as const;

export const RelationshipConfirmedPayload = RelationalEnvelope.extend({
  relationship_id: z.string().min(1),
  confirmed_by: z.enum(RELATIONAL_AUTHORITY),
  confirmation_method: z.enum(CONFIRMATION_METHODS),
  // lineage_parent_ids inherited from envelope — MUST reference the
  // originating `created` event.
}).refine((d) => d.lineage_parent_ids.length >= 1, {
  message: "relationship.confirmed.lineage_parent_ids must reference created",
});

// ─── revoked ───────────────────────────────────────────────────────────────

export const RELATIONSHIP_REVOKE_REASONS = [
  "subject_request",
  "counterparty_request",
  "safeguarding",
  "expired",
  "system",
] as const;

export const RelationshipRevokedPayload = RelationalEnvelope.extend({
  relationship_id: z.string().min(1),
  revoked_by: z.enum(RELATIONAL_AUTHORITY),
  reason: z.enum(RELATIONSHIP_REVOKE_REASONS),
}).refine((d) => d.lineage_parent_ids.length >= 1, {
  message: "relationship.revoked.lineage_parent_ids must reference created",
});

// ─── paused ────────────────────────────────────────────────────────────────

export const RelationshipPausedPayload = RelationalEnvelope.extend({
  relationship_id: z.string().min(1),
  paused_by: z.enum(RELATIONAL_AUTHORITY),
  reason: z.string().min(1),
  resume_allowed: z.boolean(),
}).refine((d) => d.lineage_parent_ids.length >= 1, {
  message: "relationship.paused.lineage_parent_ids must reference created",
});

// ─── Visibility scope re-export for callers ────────────────────────────────

export { VISIBILITY_SCOPES };
