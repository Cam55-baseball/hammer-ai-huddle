/**
 * Progress correlations — pure functions.
 *
 * Trust-first: when sample size is below threshold we return `null`. Never
 * smooth, never invent. Aligns with Release-1 measurement truth lock.
 */

export interface NumericPoint {
  readonly x: number;
  readonly y: number;
  readonly date: string; // YYYY-MM-DD
}

export interface CorrelationResult {
  readonly n: number;
  readonly r: number;
  readonly slope: number;
  readonly intercept: number;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly reading: string;
}

export const MIN_SAMPLES = 5;

export function pearson(points: ReadonlyArray<NumericPoint>): CorrelationResult | null {
  const clean = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  const n = clean.length;
  if (n < MIN_SAMPLES) return null;

  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of clean) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    syy += p.y * p.y;
    sxy += p.x * p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  const cov = sxy / n - mx * my;
  const vx = sxx / n - mx * mx;
  const vy = syy / n - my * my;
  if (vx <= 0 || vy <= 0) return null;
  const r = cov / Math.sqrt(vx * vy);
  const slope = cov / vx;
  const intercept = my - slope * mx;

  const dates = clean.map((p) => p.date).sort();
  const windowStart = dates[0];
  const windowEnd = dates[dates.length - 1];

  return {
    n,
    r,
    slope,
    intercept,
    windowStart,
    windowEnd,
    reading: plainReading(r, n),
  };
}

function plainReading(r: number, n: number): string {
  const abs = Math.abs(r);
  const dir = r > 0 ? "rises with" : "falls as";
  if (abs < 0.2) return `No clear relationship (n=${n}).`;
  if (abs < 0.4) return `Weak signal — Y ${dir} X (r=${r.toFixed(2)}, n=${n}).`;
  if (abs < 0.7) return `Moderate signal — Y ${dir} X (r=${r.toFixed(2)}, n=${n}).`;
  return `Strong signal — Y ${dir} X (r=${r.toFixed(2)}, n=${n}).`;
}
