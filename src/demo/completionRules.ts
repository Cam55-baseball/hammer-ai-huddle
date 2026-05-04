// Demo completion thresholds. A user is "demo complete" only when ALL three are met.
export const MIN_TIERS_VIEWED = 2;
export const MIN_CATEGORIES_VIEWED = 2;
export const MIN_SUBMODULES_VIEWED = 4;

export interface CompletionShape {
  tiers: number;
  categories: number;
  submodules: number;
}

export function computeCompletion(c: CompletionShape) {
  const tierPct = Math.min(1, c.tiers / MIN_TIERS_VIEWED);
  const catPct = Math.min(1, c.categories / MIN_CATEGORIES_VIEWED);
  const subPct = Math.min(1, c.submodules / MIN_SUBMODULES_VIEWED);
  // Equal-weighted across the three axes
  const pct = Math.round(((tierPct + catPct + subPct) / 3) * 100);
  const isComplete =
    c.tiers >= MIN_TIERS_VIEWED &&
    c.categories >= MIN_CATEGORIES_VIEWED &&
    c.submodules >= MIN_SUBMODULES_VIEWED;
  return {
    pct,
    isComplete,
    missing: {
      tiers: Math.max(0, MIN_TIERS_VIEWED - c.tiers),
      categories: Math.max(0, MIN_CATEGORIES_VIEWED - c.categories),
      submodules: Math.max(0, MIN_SUBMODULES_VIEWED - c.submodules),
    },
  };
}
