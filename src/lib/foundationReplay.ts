/**
 * Deterministic recommendation replay — Wave A.
 * Re-runs the scorer against the frozen trace inputs to verify the
 * scoring engine is reproducible across versions.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  parseFoundationMeta,
  scoreFoundationCandidates,
  FOUNDATION_RECOMMENDATION_VERSION,
  type FoundationTrigger,
  type FoundationScoreResult,
} from './foundationVideos';
import { TIER_BOOST } from './videoTier';

export interface ReplayOutcome {
  trace_id: string;
  matched: boolean;
  reason?: string;
  original_score: number;
  replay_score?: number;
  recommendation_version_at_trace: number;
  recommendation_version_now: number;
}

export async function replayRecommendation(traceId: string): Promise<ReplayOutcome> {
  const { data: trace, error } = await (supabase as any)
    .from('foundation_recommendation_traces')
    .select('*')
    .eq('trace_id', traceId)
    .maybeSingle();
  if (error || !trace) {
    return {
      trace_id: traceId,
      matched: false,
      reason: 'trace_not_found',
      original_score: 0,
      recommendation_version_at_trace: 0,
      recommendation_version_now: FOUNDATION_RECOMMENDATION_VERSION,
    };
  }

  const { data: video } = await (supabase as any)
    .from('library_videos')
    .select('id, title, video_url, thumbnail_url, distribution_tier, foundation_meta, foundation_effectiveness')
    .eq('id', trace.video_id)
    .maybeSingle();

  if (!video) {
    return {
      trace_id: traceId,
      matched: false,
      reason: 'video_missing',
      original_score: Number(trace.final_score),
      recommendation_version_at_trace: trace.recommendation_version,
      recommendation_version_now: FOUNDATION_RECOMMENDATION_VERSION,
    };
  }

  const meta = parseFoundationMeta(video.foundation_meta);
  if (!meta) {
    return {
      trace_id: traceId,
      matched: false,
      reason: 'meta_unparseable',
      original_score: Number(trace.final_score),
      recommendation_version_at_trace: trace.recommendation_version,
      recommendation_version_now: FOUNDATION_RECOMMENDATION_VERSION,
    };
  }

  const replayed: FoundationScoreResult[] = scoreFoundationCandidates({
    candidates: [{
      id: video.id,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      video_url: video.video_url,
      distribution_tier: video.distribution_tier,
      foundation_meta: meta,
      effectiveness: video.foundation_effectiveness ?? undefined,
    }],
    activeTriggers: (trace.active_triggers ?? []) as FoundationTrigger[],
    tierBoost: TIER_BOOST as any,
  });

  const r = replayed[0];
  const replayScore = r ? r.score : 0;
  const original = Number(trace.final_score);
  const matched =
    trace.recommendation_version === FOUNDATION_RECOMMENDATION_VERSION &&
    Math.abs(replayScore - original) < 0.01;

  return {
    trace_id: traceId,
    matched,
    reason: matched ? undefined : 'score_diverged_or_version_changed',
    original_score: original,
    replay_score: replayScore,
    recommendation_version_at_trace: trace.recommendation_version,
    recommendation_version_now: FOUNDATION_RECOMMENDATION_VERSION,
  };
}
