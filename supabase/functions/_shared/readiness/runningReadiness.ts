// Owner Oct 28: readiness is a RUNNING adjustment from the player's history, not only
// today's check-in. Pure and shared by the phone plan builder and the plan service.
// Inputs are the player's own records; anything missing is listed, never guessed.
// Band thresholds match the existing 40% low-readiness rule in the daily plan.

export interface ReadinessCheckin {
  date: string;                       // YYYY-MM-DD
  bodyReadiness?: number | null;      // 1–5 (vault check-in)
  readiness10?: number | null;        // 0–10 (Today check-in)
  hoursSlept?: number | null;
  sorenessAreas?: number | null;
  painAreas?: number | null;
  painScale?: number | null;          // 0–10
}
export interface ReadinessInput {
  today: string;
  checkins: readonly ReadinessCheckin[];
  /** Logged work rows per date (any training log). */
  workUnitsByDate: Readonly<Record<string, number>>;
  /** Past prescribed items (before today) and how many were logged. */
  prescribedPast14: number;
  completedPast14: number;
  /** Test trend from same-test comparisons; null when no comparable tests exist. */
  testTrend?: "up" | "flat" | "down" | null;
  seasonPhase?: string | null;
  gameWithinOneDay?: boolean;
}
export type ReadinessBand = "high" | "normal" | "low";
export interface RunningReadiness {
  score: number | null;               // 0–1; null = not enough history
  band: ReadinessBand | null;
  painFlag: boolean;
  loadRatio: number | null;
  completionRate: number | null;
  reasons: string[];                  // plain, 14-year-old wording
  missing: string[];
  windowDays: 14;
}

const DAY = 86_400_000;
const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const ago = (today: string, d: string) => Math.round((t(today) - t(d)) / DAY);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const LOW_BELOW = 0.4;
export const HIGH_FROM = 0.7;
/** Minimum weight of available signals (check-ins alone, or two other trends). */
export const MIN_EVIDENCE = 0.3;

export function bandFor(score: number): ReadinessBand {
  return score < LOW_BELOW ? "low" : score >= HIGH_FROM ? "high" : "normal";
}

/** Acute (last 7 days) vs the weekly average of the 3 weeks before. Null without a baseline. */
export function loadRatio(today: string, units: Readonly<Record<string, number>>): number | null {
  let acute = 0, chronic = 0;
  for (const [d, n] of Object.entries(units)) {
    const a = ago(today, d);
    if (a >= 0 && a < 7) acute += n; else if (a >= 7 && a < 28) chronic += n;
  }
  const weekly = chronic / 3;
  return weekly > 0 ? acute / weekly : null;
}

export function runningReadiness(input: ReadinessInput): RunningReadiness {
  const recent = input.checkins.filter((c) => { const a = ago(input.today, c.date); return a >= 0 && a < 14; });
  const parts: { w: number; v: number }[] = [];
  const reasons: string[] = [];
  const missing: string[] = [];

  // Check-ins: recent days count double.
  const feel: { w: number; v: number }[] = [];
  for (const c of recent) {
    const w = ago(input.today, c.date) < 3 ? 2 : 1;
    if (c.readiness10 != null && Number.isFinite(c.readiness10)) feel.push({ w, v: clamp(c.readiness10 / 10) });
    else if (c.bodyReadiness != null && Number.isFinite(c.bodyReadiness)) feel.push({ w, v: clamp((c.bodyReadiness - 1) / 4) });
  }
  if (feel.length) {
    const v = feel.reduce((a, b) => a + b.w * b.v, 0) / feel.reduce((a, b) => a + b.w, 0);
    parts.push({ w: 0.3, v });
    if (v < 0.4) reasons.push("you've been feeling worn down");
    else if (v >= 0.75) reasons.push("you've been feeling good");
  } else missing.push("check-ins");

  // Sleep trend (last 7 days).
  const sleep = recent.filter((c) => ago(input.today, c.date) < 7 && c.hoursSlept != null).map((c) => Number(c.hoursSlept));
  const sleepAvg = avg(sleep);
  if (sleepAvg != null) {
    parts.push({ w: 0.15, v: clamp((sleepAvg - 5) / 3) });
    const short = sleep.filter((h) => h < 6).length;
    if (short >= 2) reasons.push(`${short} short nights of sleep`);
    else if (sleepAvg >= 8) reasons.push("sleep is steady");
  } else missing.push("sleep");

  // Soreness trend (last 3 days).
  const sore = recent.filter((c) => ago(input.today, c.date) < 3 && c.sorenessAreas != null).map((c) => Number(c.sorenessAreas));
  const soreAvg = avg(sore);
  if (soreAvg != null) {
    parts.push({ w: 0.15, v: clamp(1 - soreAvg / 4) });
    if (soreAvg >= 2) reasons.push("you've been sore");
  } else missing.push("soreness");

  // Rolling load.
  const ratio = loadRatio(input.today, input.workUnitsByDate);
  if (ratio != null) {
    const spikeAt = input.seasonPhase === "in" || input.seasonPhase === "in_season" ? 1.3 : 1.5;
    parts.push({ w: 0.2, v: clamp(1 - (ratio - 1.1) / (spikeAt - 1.1)) });
    if (ratio >= spikeAt) reasons.push("your training load jumped this week");
    else if (ratio > 1.1) reasons.push("your training load is climbing");
  } else missing.push("training load");

  // Completion and skipped work.
  const completion = input.prescribedPast14 > 0 ? clamp(input.completedPast14 / input.prescribedPast14) : null;
  if (completion != null) {
    parts.push({ w: 0.1, v: completion });
    const skipped = Math.max(0, input.prescribedPast14 - input.completedPast14);
    if (completion < 0.5 && skipped > 0) reasons.push(`${skipped} planned items not logged`);
  } else missing.push("completed work");

  // Tests.
  if (input.testTrend) {
    parts.push({ w: 0.1, v: input.testTrend === "up" ? 1 : input.testTrend === "flat" ? 0.6 : 0.3 });
    if (input.testTrend === "down") reasons.push("your recent tests dipped");
    if (input.testTrend === "up") reasons.push("your tests are trending up");
  } else missing.push("test trend");

  // Pain flag: recent pain always lowers readiness.
  const painFlag = recent.some((c) => ago(input.today, c.date) < 3 && ((c.painScale ?? 0) >= 4 || ((c.painAreas ?? 0) > 0 && ago(input.today, c.date) < 2)));

  // One thin signal (e.g. only unlogged work) is not enough history to move the plan.
  const evidence = parts.reduce((a, b) => a + b.w, 0);
  if (evidence < MIN_EVIDENCE && !painFlag) {
    return { score: null, band: null, painFlag, loadRatio: ratio, completionRate: completion, reasons: [], missing, windowDays: 14 };
  }
  if (!parts.length) {
    return { score: null, band: null, painFlag, loadRatio: ratio, completionRate: completion,
      reasons: painFlag ? ["you reported pain"] : [], missing, windowDays: 14 };
  }
  let score = parts.reduce((a, b) => a + b.w * b.v, 0) / parts.reduce((a, b) => a + b.w, 0);
  if (painFlag) { score = Math.min(score, LOW_BELOW - 0.05); reasons.unshift("you reported pain"); }
  if (input.gameWithinOneDay && score >= HIGH_FROM) { score = HIGH_FROM - 0.01; reasons.push("you have a game coming up"); }
  score = Math.round(score * 100) / 100;
  return { score, band: bandFor(score), painFlag, loadRatio: ratio, completionRate: completion,
    reasons: reasons.slice(0, 3), missing, windowDays: 14 };
}

const BAND_WORD: Record<ReadinessBand, string> = { high: "Ready to push", normal: "Normal", low: "Take it lighter" };

/** One plain line for Today. */
export function readinessLine(r: RunningReadiness): string {
  if (r.band == null) return "Readiness from your last 14 days: not enough check-ins or logged work yet, so today stays normal.";
  const why = r.reasons.length ? ` — ${r.reasons.join(", ")}` : "";
  const what = r.band === "low" ? ". Today's sessions use their lighter version, and they still count." : ".";
  return `Readiness from your last 14 days: ${BAND_WORD[r.band]}${why}${what}`;
}
