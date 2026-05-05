// Demo completion thresholds. A user is "demo complete" only when ALL conditions are met.
export const MIN_TIERS_VIEWED = 2;
export const MIN_CATEGORIES_VIEWED = 2;
export const MIN_SUBMODULES_VIEWED = 4;
export const DEEP_INTERACTION_COUNT = 3;
export const DEEP_DWELL_MS = 20_000;
export const MIN_DEEPLY_ENGAGED = 2;

/** Default weights — submodules + depth dominate, tiers lightest. Must sum to 1. */
export const DEFAULT_WEIGHTS = {
  tiers: 0.15,
  categories: 0.20,
  submodules: 0.35,
  deep: 0.30,
} as const;

/** Back-compat alias — existing imports keep working. */
export const COMPLETION_WEIGHTS = DEFAULT_WEIGHTS;

export type WeightShape = { tiers: number; categories: number; submodules: number; deep: number };

/** Read runtime override from localStorage; fall back to defaults on any failure. */
export function getWeights(): WeightShape {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_WEIGHTS };
    const raw = localStorage.getItem('demo_completion_weights');
    if (!raw) return { ...DEFAULT_WEIGHTS };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.tiers === 'number' &&
      typeof parsed.categories === 'number' &&
      typeof parsed.submodules === 'number' &&
      typeof parsed.deep === 'number'
    ) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_WEIGHTS };
}

export function assertWeights(w: WeightShape): void {
  const sum = w.tiers + w.categories + w.submodules + w.deep;
  if (Math.abs(sum - 1) > 0.01) {
    console.warn('[demo] completion weights do not sum to 1:', w, 'sum=', sum);
  }
}

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
  const axes = {
    tiers: Math.min(1, c.tiers / MIN_TIERS_VIEWED),
    categories: Math.min(1, c.categories / MIN_CATEGORIES_VIEWED),
    submodules: Math.min(1, c.submodules / MIN_SUBMODULES_VIEWED),
    deep: Math.min(1, deep / MIN_DEEPLY_ENGAGED),
  };
  const W = getWeights();
  assertWeights(W);
  const pct = Math.round(
    (axes.tiers * W.tiers + axes.categories * W.categories +
     axes.submodules * W.submodules + axes.deep * W.deep) * 100
  );
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
