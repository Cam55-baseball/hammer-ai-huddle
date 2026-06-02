/**
 * RR-5 — relational.narrative.* event schemas.
 *
 * Constitutional: narratives are interpretive overlays. They never author
 * organism_truth, athlete_intent, authority_override, hard_stop, or
 * rehabilitation_state. Every payload that references prior organism state
 * must cite it via lineage_parent_ids (RR-5 invariant 2).
 *
 * Pure module. No I/O, no Date.now, no Math.random. Replay-safe.
 */
import { z } from "zod";
import { RelationalEnvelope } from "./schemas";

export const NARRATIVE_TOPICS = {
  memory_anchor: "relational.narrative.memory_anchor",
  slump_marker: "relational.narrative.slump_marker",
  breakthrough_marker: "relational.narrative.breakthrough_marker",
  identity_reflection: "relational.narrative.identity_reflection",
  context_recall: "relational.narrative.context_recall",
} as const;

export const NARRATIVE_TOPIC_PREFIX = "relational.narrative." as const;

const requireCitation = {
  message: "narrative event requires ≥1 lineage_parent_ids (RR-5 invariant 2)",
};

/**
 * memory_anchor — pins an observable moment for later recall. Always cites
 * the canonical event(s) it anchors to. No emotion inferred.
 */
export const MemoryAnchorPayload = RelationalEnvelope.extend({
  anchor_kind: z.enum([
    "outing",
    "checkin",
    "milestone",
    "deload",
    "self_report",
    "conversation",
  ]),
  /** Short tag, surface-facing only via copy.ts templates. */
  topic_tag: z.string().min(1).max(64),
}).refine((d) => d.lineage_parent_ids.length >= 1, requireCitation);

/**
 * slump_marker — observational pattern signal over a bounded window.
 * Never a label, never a prediction (RR-5 invariant 9).
 */
export const SlumpMarkerPayload = RelationalEnvelope.extend({
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  pattern_kind: z.enum([
    "self_report_decline",
    "contact_rate_decline",
    "load_decline",
    "engagement_decline",
  ]),
  /** Cited antecedents form the pattern. */
}).refine((d) => d.lineage_parent_ids.length >= 1, requireCitation);

/**
 * breakthrough_marker — observational positive-pattern signal. Never destiny.
 */
export const BreakthroughMarkerPayload = RelationalEnvelope.extend({
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  pattern_kind: z.enum([
    "self_report_lift",
    "outing_quality_lift",
    "consistency_lift",
  ]),
}).refine((d) => d.lineage_parent_ids.length >= 1, requireCitation);

/**
 * identity_reflection — athlete-authored only (RR-5 invariant 7).
 * Hammer / coach / parent / system_inferred may NOT emit this topic.
 * May revoke a prior reflection by id.
 */
export const IdentityReflectionPayload = RelationalEnvelope.extend({
  reflection_ref: z.string().min(1),
  revokes_event_id: z.string().min(1).nullable(),
})
  .refine((d) => d.authority === "self", {
    message: "narrative.identity_reflection.authority must be 'self'",
  });

/**
 * context_recall — quoted prior moment surfaced into the present conversation
 * thread. Must cite at least one canonical antecedent.
 */
export const ContextRecallPayload = RelationalEnvelope.extend({
  recalled_event_ids: z.array(z.string()).min(1, {
    message: "context_recall requires ≥1 recalled_event_ids",
  }),
  surface: z.enum(["hammer_thread", "journey_map"]),
}).refine((d) => d.lineage_parent_ids.length >= 1, requireCitation);

export type MemoryAnchorPayload = z.infer<typeof MemoryAnchorPayload>;
export type SlumpMarkerPayload = z.infer<typeof SlumpMarkerPayload>;
export type BreakthroughMarkerPayload = z.infer<typeof BreakthroughMarkerPayload>;
export type IdentityReflectionPayload = z.infer<typeof IdentityReflectionPayload>;
export type ContextRecallPayload = z.infer<typeof ContextRecallPayload>;
