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

/** Share of days with work set where at least one log was saved (logging consistency). */
export function loggingConsistency(days: DayRecord[]): number | null {
  const set = days.filter((d) => d.prescribed > 0);
  return set.length === 0 ? null : Math.round((set.filter((d) => d.logged).length / set.length) * 1000) / 10;
}

export interface Observation { metric: string; value: number; date: string; unit?: string | null; source?: string | null }
export interface MetricLink { metric: string; unit: string | null; result: CorrelationResult; from: string | null; to: string | null }

/**
 * Pairs each result (test, analysis, game) with the player's work-done % over the 28 days before it.
 * Results with no work set in that window are left out. Never claims cause.
 */
export function adherenceLinks(days: DayRecord[], obs: Observation[]): MetricLink[] {
  const by = new Map<string, Observation[]>();
  for (const o of obs) if (Number.isFinite(o.value)) by.set(o.metric, [...(by.get(o.metric) ?? []), o]);
  const out: MetricLink[] = [];
  for (const [metric, list] of by) {
    const pairs: Array<[number, number]> = []; const dates: string[] = [];
    for (const o of list) {
      const prev = new Date(Date.parse(o.date + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
      const c = completion(windowDays(days, prev, 28));
      if (c !== null) { pairs.push([c, o.value]); dates.push(o.date); }
    }
    dates.sort();
    out.push({ metric, unit: list[0].unit ?? null, result: correlate(pairs), from: dates[0] ?? null, to: dates[dates.length - 1] ?? null });
  }
  return out.sort((a, b) => b.result.pairs - a.result.pairs);
}
