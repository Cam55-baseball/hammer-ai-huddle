import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

/**
 * Phase 6 monetization safety gate.
 * Only solid-or-better videos may ever be wired into CTAs, bundles, or paid surfaces.
 */
export function isMonetizable(video: VideoWithTags): boolean {
  return (
    normalizeTier(video.distribution_tier) !== 'blocked' &&
    (video.confidence_score ?? 0) >= 70
  );
}
