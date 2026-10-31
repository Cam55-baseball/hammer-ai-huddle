/**
 * Owner Oct 31: conditioning is prescribed and shown in YARDS, never more than
 * 1000 yards in one session. Canonical distance stays in feet; yards are a view.
 * Pure — shared by the app and wk-generate-daily.
 */
export const SESSION_YARD_CAP = 1000;
export const BASE_YARDS = { baseball: 30, softball: 20 } as const;

export const feetToYards = (feet: number) => Math.round((feet / 3) * 10) / 10;
export const yardsToFeet = (yards: number) => Math.round(yards * 3);

export type PitchRole = "starter" | "bullpen" | "closer";

/** Owner-editable starting targets (Coaching Console). */
export interface ConditioningTargets {
  starterFromYards: number;
  starterToYards: number;
  relieverFromYards: number;
  relieverToYards: number;
  buildWeeks: number;
  lowReadinessShare: number;
}
export const DEFAULT_CONDITIONING_TARGETS: ConditioningTargets = {
  starterFromYards: 300, starterToYards: 1000,
  relieverFromYards: 300, relieverToYards: 600,
  buildWeeks: 8, lowReadinessShare: 0.7,
};

/** Week 0 = first week; target climbs evenly to the end value by the last build week. */
export function pitcherYardTarget(role: PitchRole, weekIndex: number, t: ConditioningTargets = DEFAULT_CONDITIONING_TARGETS, lowReadiness = false): { yards: number; kind: "max_sprint" | "repeat_sprint" } {
  const starter = role === "starter";
  const from = starter ? t.starterFromYards : t.relieverFromYards;
  const to = starter ? t.starterToYards : t.relieverToYards;
  const steps = Math.max(1, t.buildWeeks - 1);
  const w = Math.min(steps, Math.max(0, Math.floor(weekIndex)));
  let yards = from + ((to - from) * w) / steps;
  if (lowReadiness) yards *= t.lowReadinessShare;
  return { yards: Math.min(SESSION_YARD_CAP, Math.round(yards)), kind: starter ? "max_sprint" : "repeat_sprint" };
}

/** Whole reps of the row's declared distance that fit the target and the 1000-yd cap (at least 1). */
export function repsForYards(targetYards: number, repFeet: number): number {
  const repYards = repFeet / 3;
  if (!(repYards > 0)) return 0;
  const cap = Math.floor(SESSION_YARD_CAP / repYards);
  return Math.max(1, Math.min(cap, Math.round(Math.min(targetYards, SESSION_YARD_CAP) / repYards)));
}

/** Session total in yards for any conditioning rows (reps × distance). */
export function sessionYards(rows: readonly { sets?: number | null; reps?: number | null; distance_feet?: number | null }[]): number {
  let total = 0;
  for (const r of rows) {
    if (typeof r.distance_feet !== "number" || r.distance_feet <= 0) continue;
    total += ((r.sets ?? 1) * (r.reps ?? 1) * r.distance_feet) / 3;
  }
  return Math.round(total);
}

/** Trim the last rows' sets so the session never passes 1000 yards. */
export function capSessionYards<R extends { sets?: number | null; reps?: number | null; distance_feet?: number | null }>(rows: R[]): R[] {
  let left = SESSION_YARD_CAP;
  return rows.map((r) => {
    if (typeof r.distance_feet !== "number" || r.distance_feet <= 0) return r;
    const perSet = ((r.reps ?? 1) * r.distance_feet) / 3;
    const sets = r.sets ?? 1;
    const fit = Math.max(0, Math.min(sets, Math.floor(left / perSet)));
    left -= fit * perSet;
    return fit === sets ? r : { ...r, sets: fit };
  });
}

// -------- Per-rep feedback and smart stopping --------
export type Feel = "fast" | "same" | "slower";
export interface RepFeedback { seconds?: number | null; feel?: Feel | null; effort?: number | null; pain: boolean }
export interface StopThresholds { maxSprintDropPct: number; repeatDropPct: number; slowerInARow: number; highEffort: number; highEffortInARow: number; offerEffortMax: number; offerNearBestPct: number; offerReps: number }
export const DEFAULT_STOP_THRESHOLDS: StopThresholds = {
  maxSprintDropPct: 8, repeatDropPct: 12, slowerInARow: 2, highEffort: 9, highEffortInARow: 2,
  offerEffortMax: 7, offerNearBestPct: 3, offerReps: 2,
};

export type RepVerdict =
  | { action: "stop"; reason: "pain" | "speed_drop" | "slower_twice" | "effort_high"; caution: boolean; message: string }
  | { action: "continue" }
  | { action: "offer_more"; reps: number; message: string }
  | { action: "done" };

export function judgeReps(reps: readonly RepFeedback[], opts: { kind: "max_sprint" | "repeat_sprint"; prescribedReps: number; repFeet: number; extraUsed?: number }, t: StopThresholds = DEFAULT_STOP_THRESHOLDS): RepVerdict {
  const last = reps[reps.length - 1];
  if (!last) return { action: "continue" };
  if (last.pain) return { action: "stop", reason: "pain", caution: true, message: "Stopped: you felt pain or tightness. Logged for your check-in." };
  const timed = reps.map((r) => r.seconds).filter((s): s is number => typeof s === "number" && s > 0);
  const best = timed.length ? Math.min(...timed) : null;
  const drop = opts.kind === "max_sprint" ? t.maxSprintDropPct : t.repeatDropPct;
  const smart = "Stopped early: your speed dropped — smart stop";
  if (best && typeof last.seconds === "number" && last.seconds > best * (1 + drop / 100)) return { action: "stop", reason: "speed_drop", caution: false, message: smart };
  const tail = (n: number) => reps.slice(-n);
  if (reps.length >= t.slowerInARow && tail(t.slowerInARow).every((r) => r.feel === "slower")) return { action: "stop", reason: "slower_twice", caution: false, message: smart };
  if (reps.length >= t.highEffortInARow && tail(t.highEffortInARow).every((r) => (r.effort ?? 0) >= t.highEffort)) return { action: "stop", reason: "effort_high", caution: false, message: "Stopped early: effort stayed very high — smart stop" };
  const total = opts.prescribedReps + (opts.extraUsed ?? 0);
  if (reps.length < total) return { action: "continue" };
  const recent = tail(2);
  const nearBest = recent.length === 2 && recent.every((r) => (r.effort ?? 99) <= t.offerEffortMax &&
    (best == null ? r.feel !== "slower" : typeof r.seconds === "number" && r.seconds <= best * (1 + t.offerNearBestPct / 100)));
  const roomYards = SESSION_YARD_CAP - ((total + t.offerReps) * opts.repFeet) / 3;
  if (!opts.extraUsed && nearBest && roomYards >= 0) return { action: "offer_more", reps: t.offerReps, message: `You're still fast. Add ${t.offerReps} more reps?` };
  return { action: "done" };
}

/** Owner-edited Coaching Console values over the defaults; anything missing or invalid keeps the default. */
export function conditioningRules(raw: unknown): { targets: ConditioningTargets; stop: StopThresholds } {
  const o = (raw && typeof raw === "object" ? raw : {}) as { targets?: Record<string, unknown>; stop?: Record<string, unknown> };
  const pick = <T extends Record<string, number>>(d: T, src: Record<string, unknown> | undefined, max: Partial<Record<keyof T, number>>): T => {
    const out = { ...d };
    for (const k of Object.keys(d) as (keyof T)[]) {
      const v = src?.[k as string];
      if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= (max[k] ?? Infinity)) (out as any)[k] = v;
    }
    return out;
  };
  return {
    targets: pick(DEFAULT_CONDITIONING_TARGETS as any, o.targets, { starterFromYards: 1000, starterToYards: 1000, relieverFromYards: 1000, relieverToYards: 1000, buildWeeks: 26, lowReadinessShare: 1 }) as ConditioningTargets,
    stop: pick(DEFAULT_STOP_THRESHOLDS as any, o.stop, { maxSprintDropPct: 50, repeatDropPct: 50, slowerInARow: 5, highEffort: 10, highEffortInARow: 5, offerEffortMax: 10, offerNearBestPct: 50, offerReps: 4 }) as StopThresholds,
  };
}
export const CONDITIONING_RULES_KEY = "conditioning_rules";
