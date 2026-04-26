/**
 * System-wide messaging for the owner library.
 * Words signal stakes — these strings reinforce that this isn't passive storage.
 */
export const SYSTEM_TONE = {
  libraryHeader: "Your library determines what wins and what gets buried.",
  blockedWarning: "Cannot publish — engine rejects empty videos.",
  throttledWarning: "Reduced reach — incomplete structure.",
  throttledOwnerCard: "Underperforming — reduced visibility. Fix to restore reach.",
  featuredBoost: "Boosted reach — elite structure.",
} as const;

export type DistributionTier = 'blocked' | 'throttled' | 'normal' | 'boosted' | 'featured';

export const TIER_MULTIPLIER: Record<DistributionTier, number> = {
  blocked: 0,
  throttled: 0.55,
  normal: 1.0,
  boosted: 1.15,
  featured: 1.30,
};

export const TIER_LABEL: Record<DistributionTier, string> = {
  blocked: 'Blocked',
  throttled: 'Throttled',
  normal: 'Normal',
  boosted: 'Boosted',
  featured: 'Featured',
};

export const TIER_CLASSES: Record<DistributionTier, string> = {
  blocked: 'bg-destructive/15 text-destructive border-destructive/30',
  throttled: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  normal: 'bg-muted text-muted-foreground border-border',
  boosted: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  featured: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};
