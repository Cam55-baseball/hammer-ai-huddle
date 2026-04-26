/**
 * PHASE 7 RULES:
 * - Monetization NEVER affects ranking
 * - Ranking remains Phase 6 deterministic system
 * - Monetization is derived, not authoritative
 * - No DB writes from suggestion logic
 */
import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

/**
 * Phase 7 monetization gate.
 * Featured + Boosted are always monetizable.
 * Normal tier requires confidence ≥75.
 * Throttled + Blocked are never monetizable.
 */
export function isMonetizable(video: VideoWithTags): boolean {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured' || tier === 'boosted') return true;
  if (tier === 'normal') return (video.confidence_score ?? 0) >= 75;
  return false;
}

export type RevenueLabel = 'revenue_ready' | 'upgradeable' | null;

export function revenueLabel(video: VideoWithTags): RevenueLabel {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured' || tier === 'boosted') return 'revenue_ready';
  if (tier === 'normal' && (video.confidence_score ?? 0) >= 75) return 'upgradeable';
  return null;
}
