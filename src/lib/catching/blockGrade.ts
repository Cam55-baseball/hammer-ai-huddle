/**
 * Block success scoring — two-way perfect definition.
 *
 * A block is PERFECT when either:
 *   (a) the ball sticks in the catcher's mitt, or
 *   (b) the ball comes to rest on/at the plate — deadened, not rebounding away.
 *
 * Both outcomes leave the runner with nothing, so both score 100. There is no
 * "partial credit" ordering between them.
 *
 * Anything that rebounds away is graded by REBOUND DISTANCE, in feet, measured
 * from the plate to where the ball came to rest. The schedule below is a
 * direct rubric (domain expertise), not a `scale_reference` anchor — it
 * returns a 0-100 block score, never a fabricated 20-80 grade.
 *
 * Honesty rule: a rebound with no recorded distance returns missing.
 */

export type BlockOutcome = "stuck_in_mitt" | "deadened_at_plate" | "rebound";

export interface BlockInput {
  outcome: BlockOutcome;
  /** Required when outcome is "rebound". Feet from the plate. */
  rebound_distance_ft?: number | null;
}

export type BlockMissingReason =
  | "no_rebound_distance"
  | "negative_rebound_distance";

export type BlockResult =
  | {
      score: number;
      perfect: boolean;
      /** Plain-language statement of what was graded. */
      reason: string;
      missing: false;
    }
  | { score: null; missing: true; missing_reason: BlockMissingReason };

/**
 * Rebound distance schedule (feet → score), linearly interpolated between
 * breakpoints:
 *
 *   0-3ft   100 → 85   ball stays in the catcher's blocking zone; nobody moves
 *   3-8ft   85  → 60   recoverable, but the runner reads it and may go
 *   8-15ft  60  → 30   the runner advances on an average jump
 *   15-25ft 30  → 0    fully lost block; free base
 *   >25ft   0
 */
const REBOUND_BREAKPOINTS: ReadonlyArray<{ ft: number; score: number }> = [
  { ft: 0, score: 100 },
  { ft: 3, score: 85 },
  { ft: 8, score: 60 },
  { ft: 15, score: 30 },
  { ft: 25, score: 0 },
];

export function scoreReboundDistance(distanceFt: number): number {
  const pts = REBOUND_BREAKPOINTS;
  if (distanceFt >= pts[pts.length - 1].ft) return 0;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    if (distanceFt <= cur.ft) {
      const t = (distanceFt - prev.ft) / (cur.ft - prev.ft);
      return Math.round(prev.score + (cur.score - prev.score) * t);
    }
  }
  return 0;
}

export function scoreBlock(input: BlockInput): BlockResult {
  if (input.outcome === "stuck_in_mitt") {
    return {
      score: 100,
      perfect: true,
      reason: "Perfect block: the ball stuck in the mitt.",
      missing: false,
    };
  }

  if (input.outcome === "deadened_at_plate") {
    return {
      score: 100,
      perfect: true,
      reason:
        "Perfect block: the ball was deadened and came to rest on/at the plate — no rebound to play.",
      missing: false,
    };
  }

  const d = input.rebound_distance_ft;
  if (d == null || !Number.isFinite(d)) return { score: null, missing: true, missing_reason: "no_rebound_distance" };
  if (d < 0) return { score: null, missing: true, missing_reason: "negative_rebound_distance" };

  const score = scoreReboundDistance(d);
  return {
    score,
    // A rebound of literally 0ft is indistinguishable from a deadened block,
    // so it scores 100 — but it is still recorded as a rebound outcome.
    perfect: score === 100,
    reason: `Ball rebounded ${Math.round(d * 10) / 10}ft from the plate.`,
    missing: false,
  };
}
