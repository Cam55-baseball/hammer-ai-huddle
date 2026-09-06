/**
 * Deterministic near-best rotation band (Pass B, item 1).
 *
 * The problem: `pickBest` always returned rank 1, so the same movement won
 * every single day (goblet_squat appeared 14 times across 7 weekdays).
 *
 * The fix — gates are untouched. Every candidate handed to this module has
 * ALREADY passed legality, season, age, category and full-body gates. We only
 * change which of the near-best legal options gets taken:
 *
 *   1. score as today
 *   2. band = candidates within `fraction` of the top score
 *   3. pick `seed % band.length`
 *
 * Negative scores are legal here (`varietyPenalty` subtracts), so a literal
 * `>= 0.9 * top` is unsafe. The band is defined scale-invariantly against the
 * observed spread:
 *
 *   threshold = lo + fraction * (top - lo)
 *
 * which reduces to `>= fraction * top` for a non-negative range anchored at 0,
 * behaves correctly for negatives, and always contains the top candidate — so
 * the band can never be empty. A single-member band is byte-identical to the
 * previous behaviour.
 */

export const ROTATION_BAND_VERSION = "rotation_band_v1";

/** Chosen after the 28-day sweep — see docs/wic/stage2a-derivation-log.md. */
export const DEFAULT_ROTATION_BAND = 0.95;

export interface BandCandidate<T> {
  readonly item: T;
  readonly score: number;
}

export interface BandResult<T> {
  readonly picked: T | undefined;
  /** Everything inside the band, best-first, ties broken by pool order. */
  readonly band: readonly T[];
  readonly topScore: number;
  readonly pickedScore: number;
  /** Score given up versus always taking rank 1 (>= 0). */
  readonly scoreCost: number;
  readonly index: number;
}

/**
 * Turn a deterministic seed string into a non-negative integer.
 * Same athlete + same date + same context => same number, always.
 */
export function seedToInt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function selectFromBand<T>(
  candidates: readonly BandCandidate<T>[],
  seed: string | number,
  fraction: number = DEFAULT_ROTATION_BAND,
): BandResult<T> {
  if (candidates.length === 0) {
    return { picked: undefined, band: [], topScore: -Infinity, pickedScore: -Infinity, scoreCost: 0, index: 0 };
  }
  // Stable order: best score first, original pool order as the tie-break.
  const ordered = candidates
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i));

  const top = ordered[0].score;
  const lo = ordered[ordered.length - 1].score;
  const spread = top - lo;
  const threshold = spread === 0 ? top : lo + fraction * spread;
  // Rounded to kill float noise at the boundary — determinism over prettiness.
  const eps = 1e-9;
  const band = ordered.filter((c) => c.score >= threshold - eps);

  const n = typeof seed === "number" ? Math.abs(Math.trunc(seed)) : seedToInt(seed);
  const index = band.length > 0 ? n % band.length : 0;
  const chosen = band[index] ?? ordered[0];

  return {
    picked: chosen.item,
    band: band.map((c) => c.item),
    topScore: top,
    pickedScore: chosen.score,
    scoreCost: top - chosen.score,
    index,
  };
}
