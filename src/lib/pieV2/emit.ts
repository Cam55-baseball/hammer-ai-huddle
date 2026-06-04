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
