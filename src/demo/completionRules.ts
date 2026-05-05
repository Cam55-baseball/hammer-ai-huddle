// Demo completion thresholds. A user is "demo complete" only when ALL conditions are met.
export const MIN_TIERS_VIEWED = 2;
export const MIN_CATEGORIES_VIEWED = 2;
export const MIN_SUBMODULES_VIEWED = 4;
export const DEEP_INTERACTION_COUNT = 3;
export const DEEP_DWELL_MS = 20_000;
export const MIN_DEEPLY_ENGAGED = 2;

/** Weighted axes: submodules + depth dominate, tiers are lightest. Must sum to 1. */
export const COMPLETION_WEIGHTS = {
  tiers: 0.15,
  categories: 0.20,
  submodules: 0.35,
  deep: 0.30,
} as const;

export interface CompletionShape {
  tiers: number;
  categories: number;
  submodules: number;
  /** per-submodule interaction count: number of meaningful clicks/changes inside the shell */
  interactionCounts?: Record<string, number>;
  /** per-submodule cumulative dwell time in ms */
  dwellMs?: Record<string, number>;
}

export function deeplyEngagedCount(c: CompletionShape): number {
  const counts = c.interactionCounts ?? {};
  const dwell = c.dwellMs ?? {};
  const slugs = new Set<string>([...Object.keys(counts), ...Object.keys(dwell)]);
  let n = 0;
  for (const s of slugs) {
    if ((counts[s] ?? 0) >= DEEP_INTERACTION_COUNT || (dwell[s] ?? 0) >= DEEP_DWELL_MS) n++;
  }
  return n;
}

export function computeCompletion(c: CompletionShape) {
  const deep = deeplyEngagedCount(c);
  const axes = [
    Math.min(1, c.tiers / MIN_TIERS_VIEWED),
    Math.min(1, c.categories / MIN_CATEGORIES_VIEWED),
    Math.min(1, c.submodules / MIN_SUBMODULES_VIEWED),
    Math.min(1, deep / MIN_DEEPLY_ENGAGED),
  ];
  const pct = Math.round((axes.reduce((a, b) => a + b, 0) / axes.length) * 100);
  const isComplete =
    c.tiers >= MIN_TIERS_VIEWED &&
    c.categories >= MIN_CATEGORIES_VIEWED &&
    c.submodules >= MIN_SUBMODULES_VIEWED &&
    deep >= MIN_DEEPLY_ENGAGED;
  return {
    pct,
    isComplete,
    deep,
    missing: {
      tiers: Math.max(0, MIN_TIERS_VIEWED - c.tiers),
      categories: Math.max(0, MIN_CATEGORIES_VIEWED - c.categories),
      submodules: Math.max(0, MIN_SUBMODULES_VIEWED - c.submodules),
      deep: Math.max(0, MIN_DEEPLY_ENGAGED - deep),
    },
  };
}
