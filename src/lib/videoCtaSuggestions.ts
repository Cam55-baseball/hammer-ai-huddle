/**
 * PHASE 7 — CTA suggestion (advisory only).
 * UI surfaces these as hints. Owner Authority: never auto-applied.
 *
 * RULES:
 * - Suggestions never write to the DB
 * - Suggestions never auto-assign a CTA to a video
 * - Owner is the only actor who can wire a CTA
 *
 * PHASE 8 NOTE:
 * Suggestions are pre-execution hints only.
 * Never assume business context or override owner intent.
 */
import { normalizeTier } from './videoTier';
import type { VideoWithTags } from './videoRecommendationEngine';

export type CtaKind = 'program' | 'bundle' | 'consultation' | null;

export function suggestCta(video: VideoWithTags): CtaKind {
  const tier = normalizeTier(video.distribution_tier);
  if (tier === 'featured') return 'program';
  if (tier === 'boosted') return 'bundle';
  if ((video.confidence_score ?? 0) >= 80) return 'consultation';
  return null;
}

export const CTA_LABEL: Record<Exclude<CtaKind, null>, string> = {
  program: 'Link to a program',
  bundle: 'Bundle into a series',
  consultation: 'Offer a consultation',
};
