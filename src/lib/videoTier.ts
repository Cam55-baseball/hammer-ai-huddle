/**
 * Single source of truth for distribution tier reads.
 * Every consumer (engine, UI, monetization) MUST normalize through this.
 */
export type DistributionTier = 'blocked' | 'throttled' | 'normal' | 'boosted' | 'featured';

export function normalizeTier(t: unknown): DistributionTier {
  if (t === 'blocked' || t === 'throttled' || t === 'boosted' || t === 'featured') return t;
  return 'normal';
}

export const TIER_BOOST: Record<DistributionTier, number> = {
  blocked: 0,
  throttled: 0.55,
  normal: 1.0,
  boosted: 1.15,
  featured: 1.30,
};

export const TIER_RANK: Record<DistributionTier, number> = {
  blocked: 0,
  throttled: 1,
  normal: 2,
  boosted: 3,
  featured: 4,
};
