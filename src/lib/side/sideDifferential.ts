/**
 * sideDifferential — pure computation of L vs R deltas for a metric series.
 *
 * Trust-first: requires `MIN_PER_SIDE` samples per side. Below threshold,
 * returns `null` (NEVER smooths, NEVER infers). Used by Progress dashboards
 * and Hammer reasoning prompts to flag asymmetries the athlete should know
 * about ("Your left swing tempo runs 14% slower than right — n=7/8").
 */
import type { Side } from "./getSideFor";

export interface SidedPoint {
  readonly side: Side;
  readonly value: number;
  readonly date: string; // YYYY-MM-DD
}

export interface SideDifferentialResult {
  readonly leftN: number;
  readonly rightN: number;
  readonly leftMean: number;
  readonly rightMean: number;
  readonly diff: number;          // right - left
  readonly diffPct: number;       // (right - left) / |left| (0 if left=0)
  readonly favored: Side | "even";
  readonly reading: string;
  readonly windowStart: string;
  readonly windowEnd: string;
}

export const MIN_PER_SIDE = 3;

export function computeSideDifferential(
  points: ReadonlyArray<SidedPoint>,
  opts: { higherIsBetter?: boolean; metricLabel?: string } = {},
): SideDifferentialResult | null {
  const clean = points.filter((p) => Number.isFinite(p.value));
  const left = clean.filter((p) => p.side === "L");
  const right = clean.filter((p) => p.side === "R");
  if (left.length < MIN_PER_SIDE || right.length < MIN_PER_SIDE) return null;

  const mean = (arr: ReadonlyArray<SidedPoint>) =>
    arr.reduce((s, p) => s + p.value, 0) / arr.length;
  const leftMean = mean(left);
  const rightMean = mean(right);
  const diff = rightMean - leftMean;
  const denom = Math.abs(leftMean) > 1e-9 ? Math.abs(leftMean) : 1;
  const diffPct = diff / denom;

  const higherIsBetter = opts.higherIsBetter ?? true;
  const favored: Side | "even" =
    Math.abs(diff) < 1e-6
      ? "even"
      : higherIsBetter
        ? diff > 0 ? "R" : "L"
        : diff > 0 ? "L" : "R";

  const dates = clean.map((p) => p.date).sort();
  const label = opts.metricLabel ?? "metric";

  const pct = (Math.abs(diffPct) * 100).toFixed(0);
  const reading =
    favored === "even"
      ? `${label}: even L vs R (n=${left.length}/${right.length}).`
      : `${label}: ${favored} side leads by ${pct}% (n=${left.length} L / ${right.length} R).`;

  return {
    leftN: left.length,
    rightN: right.length,
    leftMean,
    rightMean,
    diff,
    diffPct,
    favored,
    reading,
    windowStart: dates[0],
    windowEnd: dates[dates.length - 1],
  };
}
