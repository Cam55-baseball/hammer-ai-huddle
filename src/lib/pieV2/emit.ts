/**
 * PIE V2 — canonical emission wrapper.
 *
 * Publishes `pitching.v2.<signal>` events through the canonical
 * emitAsbEvent path. Never opens a parallel storage surface. Preserves
 * provenance, confidence, missingness, frame-range lineage.
 *
 * Subordinate to Megaphase 76–90 (event fabric), Phase 46 (event ledger),
 * Phase 47 (replay law), Megaphase 151 (relational substrate).
 */
import { emitAsbEvent, emitAsbLineage } from "@/lib/asb/emit";
import { computeIdempotencyKey } from "@/lib/asb/engineVersion";
import { PIE_V2_ENGINE_VERSION, type PieV2RepInput, type PieV2RepScore, type PieV2SessionAggregate } from "./types";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";

export interface PieV2EmitContext {
  /** Provided when the rep originates from a video annotation. */
  parent_video_event_id?: string;
  actor_role?: "athlete" | "coach" | "ai" | "system";
  actor_id?: string | null;
}

export async function emitPieV2RepScore(
  rep: PieV2RepInput,
  score: PieV2RepScore,
  ctx: PieV2EmitContext = {},
): Promise<void> {
  const topic_id = PIE_V2_SIGNALS[score.signal_id].topic_id;
  const occurred_at = rep.occurred_at;
  const payload = {
    rep_id: rep.rep_id,
    session_id: rep.session_id,
    signal_id: score.signal_id,
    score: score.score,
    tier: score.tier,
    confidence: score.confidence,
    missingness: score.missingness,
    provenance: score.provenance,
    tracked_only: score.tracked_only,
    video_id: rep.video_id ?? null,
    video_frame_range: rep.video_frame_range ?? null,
    athlete_reported_pain: rep.athlete_reported_pain ?? null,
    engine_version: PIE_V2_ENGINE_VERSION,
  };

  const idempotency_key = await computeIdempotencyKey({
    athlete_id: rep.athlete_id,
    topic_id,
    occurred_at,
    payload,
  });

  const event_id = idempotency_key.slice(0, 32);

  const result = await emitAsbEvent({
    event_id,
    athlete_id: rep.athlete_id,
    topic_id,
    actor_role: ctx.actor_role ?? "system",
    actor_id: ctx.actor_id ?? null,
    occurred_at,
    ingested_at: new Date().toISOString(),
    effective_at: occurred_at,
    valid_from: occurred_at,
    valid_to: null,
    payload,
    engine_version: PIE_V2_ENGINE_VERSION,
    idempotency_key,
    causality_refs: { rep_id: rep.rep_id, session_id: rep.session_id },
    lineage_refs: ctx.parent_video_event_id
      ? { parent_video_event_id: ctx.parent_video_event_id }
      : {},
  });

  if (result.ok && ctx.parent_video_event_id) {
    await emitAsbLineage({
      parent_event_id: ctx.parent_video_event_id,
      child_event_id: event_id,
      derivation_type: "video_annotation_to_pie_v2",
      engine_version: PIE_V2_ENGINE_VERSION,
    });
  }
}

export async function emitPieV2SessionAggregate(
  agg: PieV2SessionAggregate,
  ctx: PieV2EmitContext = {},
): Promise<void> {
  const topic_id = "pitching.v2.session_aggregate";
  const payload = {
    session_id: agg.session_id,
    pie_v2_composite: agg.pie_v2_composite,
    signals: agg.signals,
    athlete_reported_pain_in_session: agg.athlete_reported_pain_in_session,
    engine_version: PIE_V2_ENGINE_VERSION,
  };
  const idempotency_key = await computeIdempotencyKey({
    athlete_id: agg.athlete_id,
    topic_id,
    occurred_at: agg.computed_at,
    payload,
  });
  await emitAsbEvent({
    event_id: idempotency_key.slice(0, 32),
    athlete_id: agg.athlete_id,
    topic_id,
    actor_role: ctx.actor_role ?? "system",
    actor_id: ctx.actor_id ?? null,
    occurred_at: agg.computed_at,
    ingested_at: new Date().toISOString(),
    effective_at: agg.computed_at,
    valid_from: agg.computed_at,
    valid_to: null,
    payload,
    engine_version: PIE_V2_ENGINE_VERSION,
    idempotency_key,
    causality_refs: { session_id: agg.session_id },
    lineage_refs: {},
  });
}

/**
 * Wave-1 closure §1.3 — RR-6 arm-health advisory emission.
 *
 * Derives a bounded caution from the session aggregate and (when level
 * != "none") publishes `pitching.v2.arm_health_caution` through the
 * canonical event fabric. The safeguarding projection
 * (`safeguardingNotifications.ts`) subscribes to `pitching.v2.*` and will
 * route this signal through `classifySafeguardingSignal`.
 *
 * Never diagnoses, never prescribes. Athlete-reported pain outranks
 * inferred mechanical risk per RR-6.
 */
export async function emitPieV2ArmHealthCaution(input: {
  athlete_id: string;
  session_id: string;
  occurred_at: string;
  level: "watch" | "elevated";
  contributing_factors: string[];
  athlete_reported_pain: boolean;
  recommended_action: string;
  parent_aggregate_event_id?: string;
  ctx?: PieV2EmitContext;
}): Promise<void> {
  const topic_id = "pitching.v2.arm_health_caution";
  // Elevated caution arrives at the safety surface as a safeguarding-class
  // signal; classifySafeguardingSignal will route per RR-6 + minor status.
  const payload: Record<string, unknown> = {
    session_id: input.session_id,
    level: input.level,
    contributing_factors: input.contributing_factors,
    athlete_reported_pain: input.athlete_reported_pain,
    recommended_action: input.recommended_action,
    visibility_scope: "self",
    confidence: 1,
    authority: "system",
    safeguarding_category: input.level === "elevated",
    engine_version: PIE_V2_ENGINE_VERSION,
  };
  const idempotency_key = await computeIdempotencyKey({
    athlete_id: input.athlete_id,
    topic_id,
    occurred_at: input.occurred_at,
    payload,
  });
  const event_id = idempotency_key.slice(0, 32);
  const result = await emitAsbEvent({
    event_id,
    athlete_id: input.athlete_id,
    topic_id,
    actor_role: input.ctx?.actor_role ?? "system",
    actor_id: input.ctx?.actor_id ?? null,
    occurred_at: input.occurred_at,
    ingested_at: new Date().toISOString(),
    effective_at: input.occurred_at,
    valid_from: input.occurred_at,
    valid_to: null,
    payload,
    engine_version: PIE_V2_ENGINE_VERSION,
    idempotency_key,
    causality_refs: { session_id: input.session_id },
    lineage_refs: input.parent_aggregate_event_id
      ? { parent_aggregate_event_id: input.parent_aggregate_event_id }
      : {},
  });

  if (result.ok && input.parent_aggregate_event_id) {
    await emitAsbLineage({
      parent_event_id: input.parent_aggregate_event_id,
      child_event_id: event_id,
      derivation_type: "session_aggregate_to_arm_health_caution",
      engine_version: PIE_V2_ENGINE_VERSION,
    });
  }
}
