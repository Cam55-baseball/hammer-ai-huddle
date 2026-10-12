/**
 * Plan 4 §C — discipline and attendance math. Pure functions over real logs.
 * Correlations never claim cause; fewer than MIN_PAIRS pairs = "Not enough data".
 */
export interface DayRecord { date: string; prescribed: number; done: number; logged: boolean }
export const MIN_PAIRS = 8;

export function completion(days: DayRecord[]): number | null {
  const p = days.reduce((s, d) => s + d.prescribed, 0);
  return p === 0 ? null : Math.round((days.reduce((s, d) => s + Math.min(d.done, d.prescribed), 0) / p) * 1000) / 10;
}

export function missedDays(days: DayRecord[]): number {
  return days.filter((d) => d.prescribed > 0 && d.done === 0).length;
}

/** Current streak: consecutive most-recent days with work prescribed where all of it was done. */
export function currentStreak(days: DayRecord[]): number {
  const s = [...days].filter((d) => d.prescribed > 0).sort((a, b) => b.date.localeCompare(a.date));
  let n = 0;
  for (const d of s) { if (d.done >= d.prescribed) n++; else break; }
  return n;
}

export function windowDays(days: DayRecord[], endDate: string, n: 7 | 28 | 90): DayRecord[] {
  const end = new Date(endDate + "T00:00:00Z").getTime();
  const start = end - (n - 1) * 86400000;
  return days.filter((d) => { const t = new Date(d.date + "T00:00:00Z").getTime(); return t >= start && t <= end; });
}

export type CorrelationResult =
  | { kind: "not_enough_data"; pairs: number; label: "Not enough data" }
  | { kind: "result"; pairs: number; r: number; direction: "positive" | "negative" | "none"; label: string };

export function correlate(pairs: Array<[number, number]>): CorrelationResult {
  const n = pairs.length;
  if (n < MIN_PAIRS) return { kind: "not_enough_data", pairs: n, label: "Not enough data" };
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (sxx === 0 || syy === 0) return { kind: "not_enough_data", pairs: n, label: "Not enough data" };
  const r = Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100;
  const direction = r >= 0.3 ? "positive" : r <= -0.3 ? "negative" : "none";
  const label = direction === "none"
    ? `No clear link (${n} pairs). This does not show cause.`
    : `${direction === "positive" ? "Positive" : "Negative"} link (${n} pairs). This does not show cause.`;
  return { kind: "result", pairs: n, r, direction, label };
}
