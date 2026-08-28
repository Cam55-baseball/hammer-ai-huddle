/**
 * Catch probability + OAE credit — pure computation.
 *
 * Given how long the ball hung in the air and how far the fielder had to
 * travel, returns the probability an average fielder makes the catch, and the
 * outs-above-expected credit once the actual outcome is known.
 *
 * Model: an average fielder reacts in REACTION_SEC, then covers ground at
 * CLOSING_SPEED_FPS. The time margin between hang time and the time the play
 * required is squashed through a logistic curve.
 *
 * Honesty rule: missing or unusable inputs return a missing result with a
 * reason. A probability is never fabricated.
 */

export const REACTION_SEC = 0.5;
export const CLOSING_SPEED_FPS = 22;
const LOGISTIC_SCALE = 0.35;

export type CatchProbabilityMissingReason =
  | "no_hang_time"
  | "no_distance_to_cover";

export type CatchProbabilityResult =
  | { probability: number; missing: false }
  | { probability: null; missing: true; missing_reason: CatchProbabilityMissingReason };

function missing(reason: CatchProbabilityMissingReason): CatchProbabilityResult {
  return { probability: null, missing: true, missing_reason: reason };
}

function usable(v: number | null | undefined, allowZero = false): v is number {
  return v != null && Number.isFinite(v) && (allowZero ? v >= 0 : v > 0);
}

/**
 * @param hangTimeSec time the ball was in the air, seconds
 * @param distanceToCoverFt distance from the fielder's position at contact to
 *        the ball's landing spot, feet
 */
export function computeCatchProbability(
  hangTimeSec: number | null | undefined,
  distanceToCoverFt: number | null | undefined,
): CatchProbabilityResult {
  if (!usable(hangTimeSec)) return missing("no_hang_time");
  if (!usable(distanceToCoverFt, true)) return missing("no_distance_to_cover");

  const requiredSec = REACTION_SEC + distanceToCoverFt / CLOSING_SPEED_FPS;
  const marginSec = hangTimeSec - requiredSec;
  const p = 1 / (1 + Math.exp(-marginSec / LOGISTIC_SCALE));

  // Clamp away from absolute certainty — no play is 0% or 100%.
  const clamped = Math.max(0.01, Math.min(0.99, p));
  return { probability: Math.round(clamped * 1000) / 1000, missing: false };
}

/** Outcomes that count as the fielder converting the opportunity into an out. */
export const CONVERTED_OUTCOMES = ["out", "caught", "assist", "double_play"] as const;

export function isConvertedOutcome(outcome: string | null | undefined): boolean {
  return (CONVERTED_OUTCOMES as readonly string[]).includes(outcome ?? "");
}

/**
 * Outs above expected for a single play: 1 (or 0) minus the catch probability.
 * Returns null when catch probability is missing — OAE without an expectation
 * is not a number, it is a guess.
 */
export function computeOaeCredit(
  probability: number | null,
  outcome: string | null | undefined,
): number | null {
  if (probability == null || !Number.isFinite(probability)) return null;
  if (!outcome) return null;
  const converted = isConvertedOutcome(outcome) ? 1 : 0;
  return Math.round((converted - probability) * 1000) / 1000;
}
