// Release A2 (owner-approved Nov 8): readiness inputs that need no watch, plus the Apple Health effect.
// Pure and shared by the plan builder (wk-generate-daily) and Today's readiness line.
//
// Rules:
//  - Stress (the check-in's existing stress answer) and mental load (rating × minutes after
//    non-exercise cards, vs the athlete's own recent normal) are behind `mental_load_v1`.
//  - Apple Health HRV (ln SDNN, 7-day mean vs own 30-day mean/SD) and resting heart rate are
//    behind `readiness_health_v1`, and only count with at least 14 days of data. No data = no
//    effect and no penalty; an Apple Watch is never required.
//  - The day's adjustment is the LARGER single effect, never the sum, with a cap.
//  - It moves only the recovery side of that day's readiness. It never changes throw counts,
//    sprint caps or lift caps, and it is never fed into the greenlight step-up rule.
//  - Missing answers are unknown, never guessed.
// Every number here is PROPOSED and editable by the owner in the Coaching Console.
import { bandFor, type RunningReadiness } from "./runningReadiness.ts";

export const RECOVERY_SETTING_KEY = "readiness_recovery_inputs_v1";

export interface RecoveryThresholds {
  capDown: number;            // largest drop on the 0–1 readiness scale
  capUp: number;              // largest lift
  stressFrom: number;         // 1–5 stress at/above this lowers readiness
  stressStep: number;         // drop per stress step at/above stressFrom
  mentalMinDays: number;      // days with mental-load answers needed for a personal normal
  mentalWindowDays: number;   // look-back for the personal normal
  mentalHighRatio: number;    // yesterday ÷ normal at/above this = draining day
  mentalHighDrop: number;
  mentalVeryHighRatio: number;
  mentalVeryHighDrop: number;
  healthMinDays: number;      // days of Apple Health data before HRV/RHR count
  hrvRecentDays: number;
  hrvMinRecentDays: number;
  healthBaselineDays: number;
  hrvLowSd: number;           // 7-day mean below baseline − this × SD lowers readiness
  hrvLowDrop: number;
  hrvHighLift: number;        // 7-day mean at/above baseline mean
  rhrAboveBpm: number;        // 7-day resting HR more than this above baseline lowers readiness
  rhrDrop: number;
}

/** Proposed defaults (owner edits them in the Coaching Console). */
export const PROPOSED_RECOVERY_THRESHOLDS: RecoveryThresholds = {
  capDown: 0.15, capUp: 0.05,
  stressFrom: 4, stressStep: 0.05,
  mentalMinDays: 5, mentalWindowDays: 14, mentalHighRatio: 1.5, mentalHighDrop: 0.05, mentalVeryHighRatio: 2, mentalVeryHighDrop: 0.1,
  healthMinDays: 14, hrvRecentDays: 7, hrvMinRecentDays: 3, healthBaselineDays: 30,
  hrvLowSd: 0.5, hrvLowDrop: 0.1, hrvHighLift: 0.02,
  rhrAboveBpm: 5, rhrDrop: 0.1,
};

/** Saved owner values over the proposed defaults; anything invalid keeps the proposed value. */
export function recoveryThresholdsFrom(saved: unknown): RecoveryThresholds {
  const out = { ...PROPOSED_RECOVERY_THRESHOLDS };
  if (!saved || typeof saved !== "object") return out;
  for (const k of Object.keys(out) as (keyof RecoveryThresholds)[]) {
    const v = Number((saved as Record<string, unknown>)[k]);
    if ((saved as Record<string, unknown>)[k] != null && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

export interface StressAnswer { at: string; value: number; scale: 5 | 10 }
export interface HealthSampleRow { captured_at: string; metric: string | null; hrv_ms?: number | null; rhr_bpm?: number | null; source?: string | null }
export interface MentalLoadRow { activity_date: string; value: number }

export interface RecoveryInputs {
  planDate: string;                      // YYYY-MM-DD
  stress: readonly StressAnswer[];       // today's stress answers (any check-in)
  mentalLoads: readonly MentalLoadRow[]; // ledger mental_load rows (only known values)
  health: readonly HealthSampleRow[];    // Apple Health rows
}
export interface RecoveryFlags { mentalLoad: boolean; health: boolean }

export type EffectSource = "stress" | "mental_load" | "hrv" | "resting_hr";
export interface Effect { source: EffectSource; delta: number; reason: string }
export interface RecoveryAdjustment {
  delta: number;                 // the one applied change (0 = none)
  chosen: Effect | null;
  effects: Effect[];             // every non-zero candidate (for "Why today's plan changed")
  unknown: EffectSource[];       // inputs that were missing (never guessed)
}

const DAY = 86_400_000;
const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const daysBefore = (planDate: string, d: string) => Math.round((dayMs(planDate) - dayMs(d)) / DAY);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Any stress answer on a 1–5 scale (10-point answers map linearly: 1→1, 10→5). */
export function stressOn5(a: StressAnswer): number | null {
  if (!Number.isFinite(a.value)) return null;
  return a.scale === 5 ? Math.max(1, Math.min(5, a.value)) : 1 + (Math.max(1, Math.min(10, a.value)) - 1) * 4 / 9;
}

export function stressEffect(answers: readonly StressAnswer[], t: RecoveryThresholds): Effect | null | "unknown" {
  const latest = [...answers].filter((a) => stressOn5(a) != null).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!latest) return "unknown";
  const s = stressOn5(latest)!;
  if (s < t.stressFrom) return null;
  return { source: "stress", delta: -round2((s - t.stressFrom + 1) * t.stressStep), reason: "you said you're feeling stressed" };
}

/** Yesterday's mental load vs the athlete's own normal (days with answers only). */
export function mentalLoadEffect(planDate: string, rows: readonly MentalLoadRow[], t: RecoveryThresholds): Effect | null | "unknown" {
  const byDay = new Map<string, number>();
  for (const r of rows) if (Number.isFinite(r.value) && r.value > 0) byDay.set(r.activity_date, (byDay.get(r.activity_date) ?? 0) + r.value);
  let yesterday: number | null = null;
  const normal: number[] = [];
  for (const [d, v] of byDay) {
    const ago = daysBefore(planDate, d);
    if (ago === 1) yesterday = v;
    else if (ago >= 2 && ago <= t.mentalWindowDays + 1) normal.push(v);
  }
  if (yesterday == null || normal.length < t.mentalMinDays) return "unknown";
  const ratio = yesterday / mean(normal);
  if (ratio >= t.mentalVeryHighRatio) return { source: "mental_load", delta: -t.mentalVeryHighDrop, reason: "yesterday was much more mentally draining than usual" };
  if (ratio >= t.mentalHighRatio) return { source: "mental_load", delta: -t.mentalHighDrop, reason: "yesterday was more mentally draining than usual" };
  return null;
}

function dailyMeans(planDate: string, rows: readonly HealthSampleRow[], pick: (r: HealthSampleRow) => number | null, windowDays: number) {
  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    const v = pick(r);
    if (v == null || !Number.isFinite(v)) continue;
    const d = String(r.captured_at).slice(0, 10);
    const ago = daysBefore(planDate, d);
    if (ago < 0 || ago >= windowDays) continue;
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(v);
  }
  return [...byDay].map(([d, xs]) => ({ d, ago: daysBefore(planDate, d), v: mean(xs) }));
}

export function hrvEffect(planDate: string, rows: readonly HealthSampleRow[], t: RecoveryThresholds): Effect | null | "unknown" {
  const days = dailyMeans(planDate, rows, (r) => (r.metric === "hrv_sdnn" && (r.hrv_ms ?? 0) > 0 ? Math.log(Number(r.hrv_ms)) : null), t.healthBaselineDays);
  const recent = days.filter((x) => x.ago < t.hrvRecentDays);
  if (days.length < t.healthMinDays || recent.length < t.hrvMinRecentDays) return "unknown";
  const base = days.map((x) => x.v);
  const mu = mean(base), sigma = sd(base), m7 = mean(recent.map((x) => x.v));
  if (sigma > 0 && m7 < mu - t.hrvLowSd * sigma) return { source: "hrv", delta: -t.hrvLowDrop, reason: "your heart-rate variability is below your normal" };
  if (m7 >= mu && t.hrvHighLift > 0) return { source: "hrv", delta: t.hrvHighLift, reason: "your heart-rate variability is at or above your normal" };
  return null;
}

export function restingHrEffect(planDate: string, rows: readonly HealthSampleRow[], t: RecoveryThresholds): Effect | null | "unknown" {
  const days = dailyMeans(planDate, rows, (r) => (r.metric === "resting_hr" && (r.rhr_bpm ?? 0) > 0 ? Number(r.rhr_bpm) : null), t.healthBaselineDays);
  const recent = days.filter((x) => x.ago < t.hrvRecentDays);
  if (days.length < t.healthMinDays || recent.length < t.hrvMinRecentDays) return "unknown";
  const m7 = mean(recent.map((x) => x.v)), mu = mean(days.map((x) => x.v));
  if (m7 > mu + t.rhrAboveBpm) return { source: "resting_hr", delta: -t.rhrDrop, reason: "your resting heart rate is higher than your normal" };
  return null;
}

/** The larger single effect (never the sum): the biggest drop if any, else the biggest lift; capped. */
export function recoveryAdjustment(input: RecoveryInputs, flags: RecoveryFlags, t: RecoveryThresholds = PROPOSED_RECOVERY_THRESHOLDS): RecoveryAdjustment {
  const effects: Effect[] = [];
  const unknown: EffectSource[] = [];
  const take = (source: EffectSource, r: Effect | null | "unknown") => {
    if (r === "unknown") unknown.push(source);
    else if (r && r.delta !== 0) effects.push(r);
  };
  if (flags.mentalLoad) {
    take("stress", stressEffect(input.stress, t));
    take("mental_load", mentalLoadEffect(input.planDate, input.mentalLoads, t));
  }
  if (flags.health) {
    take("hrv", hrvEffect(input.planDate, input.health, t));
    take("resting_hr", restingHrEffect(input.planDate, input.health, t));
  }
  const drops = effects.filter((e) => e.delta < 0).sort((a, b) => a.delta - b.delta);
  const lifts = effects.filter((e) => e.delta > 0).sort((a, b) => b.delta - a.delta);
  const chosen = drops[0] ?? lifts[0] ?? null;
  const delta = chosen ? round2(Math.max(-t.capDown, Math.min(t.capUp, chosen.delta))) : 0;
  return { delta, chosen: chosen ? { ...chosen, delta } : null, effects, unknown };
}

/**
 * That day's readiness with the recovery adjustment. Returns a NEW object (the 14-day running
 * readiness itself, the greenlight inputs and every physical limit stay as they were).
 * No running score yet = no change.
 */
export function applyRecoveryAdjustment(running: RunningReadiness | null, adj: RecoveryAdjustment): RunningReadiness | null {
  if (!running || running.score == null || !adj.chosen || adj.delta === 0) return running;
  let score = Math.max(0, Math.min(1, running.score + adj.delta));
  if (running.painFlag) score = Math.min(score, running.score); // pain still caps; a lift never overrides it
  score = round2(score);
  const reasons = adj.delta < 0 ? [adj.chosen.reason, ...running.reasons] : [...running.reasons, adj.chosen.reason];
  return { ...running, score, band: bandFor(score), reasons: reasons.slice(0, 3) };
}

/** True when the recovery inputs alone turned the day lighter (the plan then never lowers a cap). */
export function lightenedByRecoveryOnly(raw: RunningReadiness | null, adjusted: RunningReadiness | null): boolean {
  return !!adjusted && adjusted.band === "low" && raw?.band !== "low";
}
