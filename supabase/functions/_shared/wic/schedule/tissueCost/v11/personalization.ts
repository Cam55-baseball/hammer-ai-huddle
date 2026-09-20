// TCS v1.1 §2 — personalization: athletes like you first, then you.
// PURE: no clock, no database, no network. Deterministic for identical inputs.
// Not wired into any generator, edge function or client.

import { TANKS, type Tank, type TankLevels, type TrainingAgeBand, type Phase, type GameRole } from "../types.ts";
import { addDays, isValidDate } from "../tanks.ts";

export const TCS_PERSONALIZATION_VERSION = "tcs_pers_v1_1";

/** §2 shrinkage constant — k sessions of cohort weight. */
export const SHRINKAGE_K = 12;
/** §2 minimum-data gates. */
export const COHORT_MIN_ATHLETES = 30;
export const COHORT_MIN_SESSIONS = 300;
export const PERSONAL_MIN_SESSIONS = 8;
/** §2 guardrails. */
export const MULTIPLIER_BOUNDS = { min: 0.85, max: 1.35 } as const;
export const WEEKLY_CHANGE_CAP = 0.05;
/** §2 best-future-outcome horizon. */
export const OUTCOME_HORIZON_DAYS = 14;
/** §0/§2 tie-break: the 3-day default always wins a tie. */
export const DEFAULT_REST_DAYS = 3;

/* ------------------------------------------------------------------ outcomes */

/** Raw, optional per-session measurements. Everything may be missing. */
export interface SessionOutcomeInput {
  date: string;
  /** Estimated max on the main lift, in lb. */
  estimatedMax?: number | null;
  repsCompleted?: number | null;
  repsPrescribed?: number | null;
  /** Logged load ÷ target load. */
  loadCompliance?: number | null;
  /** Any test on the day: jump (in), sprint (s, lower better), velocity (mph). */
  jump?: number | null;
  sprint?: number | null;
  velocity?: number | null;
  /** Next-day check-in, 1–10, higher is better. */
  nextDayCheckIn?: number | null;
  cutShort?: boolean | null;
  /** Full rest days before this session, and tank levels at session time. */
  restDays?: number | null;
  tankLevelsAtSession?: TankLevels | null;
}

/** The athlete's own rolling baseline. Missing fields → that signal is skipped. */
export interface OutcomeBaseline {
  estimatedMax?: number | null;
  jump?: number | null;
  sprint?: number | null;
  velocity?: number | null;
  checkIn?: number | null;
}

export interface SessionOutcomeScore {
  date: string;
  /** 0–1, 0.5 = exactly at baseline. null when nothing was measured. */
  score: number | null;
  componentsUsed: string[];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Ratio vs baseline mapped onto 0–1, where 1.00 → 0.5 and ±20% → 0/1. */
function ratioScore(value: number, baseline: number, higherIsBetter = true): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) return null;
  const r = higherIsBetter ? value / baseline : baseline / value;
  return clamp(0.5 + (r - 1) / 0.4, 0, 1);
}

/** §2 — Session Outcome Score from whatever exists. Never invents a signal. */
export function computeSOS(
  s: SessionOutcomeInput,
  baseline: OutcomeBaseline,
): SessionOutcomeScore {
  const parts: { key: string; value: number; weight: number }[] = [];
  const push = (key: string, v: number | null, weight: number) => {
    if (v !== null && Number.isFinite(v)) parts.push({ key, value: v, weight });
  };

  if (s.estimatedMax != null && baseline.estimatedMax != null) {
    push("estimated_max_trend", ratioScore(s.estimatedMax, baseline.estimatedMax), 3);
  }
  if (s.repsCompleted != null && s.repsPrescribed != null && s.repsPrescribed > 0) {
    push("reps_at_target", clamp(s.repsCompleted / s.repsPrescribed, 0, 1.25) / 1.25, 2);
  }
  if (s.loadCompliance != null && Number.isFinite(s.loadCompliance)) {
    push("load_compliance", clamp(s.loadCompliance, 0, 1.25) / 1.25, 2);
  }
  if (s.jump != null && baseline.jump != null) push("jump_test", ratioScore(s.jump, baseline.jump), 2);
  if (s.sprint != null && baseline.sprint != null) {
    push("sprint_test", ratioScore(s.sprint, baseline.sprint, false), 2);
  }
  if (s.velocity != null && baseline.velocity != null) {
    push("velocity_test", ratioScore(s.velocity, baseline.velocity), 2);
  }
  if (s.nextDayCheckIn != null && baseline.checkIn != null) {
    push("next_day_check_in", ratioScore(s.nextDayCheckIn, baseline.checkIn), 1);
  }
  if (s.cutShort != null) push("cut_short", s.cutShort ? 0 : 1, 1);

  if (parts.length === 0) return { date: s.date, score: null, componentsUsed: [] };
  let num = 0;
  let den = 0;
  for (const p of parts) {
    num += p.value * p.weight;
    den += p.weight;
  }
  return {
    date: s.date,
    score: clamp(num / den, 0, 1),
    componentsUsed: parts.map((p) => p.key).sort(),
  };
}

/* ------------------------------------------------------------- cohort priors */

export interface CohortKey {
  sport: string;
  positionGroup: string;
  ageBand: string;
  sex: string;
  trainingAgeBand: TrainingAgeBand | "unknown";
  phase: Phase;
}

export interface CohortEstimate {
  key: CohortKey;
  athletes: number;
  sessions: number;
  /** Recovery multiplier per tank, as observed in the cohort. */
  multipliers: TankLevels;
}

export function cohortKeyOf(p: {
  sport?: string | null;
  position?: GameRole | null;
  age?: number | null;
  sex?: string | null;
  trainingAgeBand?: TrainingAgeBand | null;
  phase: Phase;
}): CohortKey {
  const age = typeof p.age === "number" && Number.isFinite(p.age) ? p.age : null;
  const ageBand = age === null ? "unknown" : age <= 12 ? "u13" : age <= 15 ? "13_15" : age <= 18 ? "16_18" : "19_plus";
  return {
    sport: (p.sport ?? "unknown").toLowerCase(),
    positionGroup: (p.position ?? "unknown").toLowerCase(),
    ageBand,
    sex: (p.sex ?? "unknown").toLowerCase(),
    trainingAgeBand: p.trainingAgeBand ?? "unknown",
    phase: p.phase,
  };
}

export function cohortKeyString(k: CohortKey): string {
  return [k.sport, k.positionGroup, k.ageBand, k.sex, k.trainingAgeBand, k.phase].join("|");
}

/** §2 gate — a cohort is used only with ≥30 athletes and ≥300 sessions. */
export function cohortIsUsable(c: CohortEstimate | null | undefined): boolean {
  return !!c && c.athletes >= COHORT_MIN_ATHLETES && c.sessions >= COHORT_MIN_SESSIONS;
}

/* --------------------------------------------------------- personal learning */

export function neutralMultipliers(): TankLevels {
  return { nerve: 1, muscle: 1, connective: 1, arm: 1 };
}

/**
 * §2 — how the athlete's SOS moves with rest days, expressed as a per-tank
 * recovery multiplier. >1 = recovers slower than the config default (needs
 * more rest), <1 = recovers faster. Fitted with a bounded, deterministic slope.
 */
export function personalMultipliers(scored: {
  score: number;
  restDays: number;
  tankLevelsAtSession: TankLevels | null;
}[]): { multipliers: TankLevels; n: number } {
  const usable = scored.filter(
    (s) => Number.isFinite(s.score) && Number.isFinite(s.restDays) && s.restDays >= 0,
  );
  if (usable.length === 0) return { multipliers: neutralMultipliers(), n: 0 };

  const out = neutralMultipliers();
  for (const tank of TANKS) {
    // Correlate SOS with the tank level at session time: high level + good
    // outcome → recovers faster; high level + poor outcome → recovers slower.
    let sw = 0;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    for (const s of usable) {
      const lv = s.tankLevelsAtSession ? s.tankLevelsAtSession[tank as Tank] : null;
      if (lv == null || !Number.isFinite(lv)) continue;
      const x = lv;
      const y = s.score;
      sw += 1;
      sx += x;
      sy += y;
      sxy += x * y;
      sxx += x * x;
    }
    if (sw < 2) continue;
    const denom = sw * sxx - sx * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const slope = (sw * sxy - sx * sy) / denom;
    // A negative slope (outcome falls as the tank fills) means slower recovery.
    out[tank as Tank] = clamp(1 - slope * 40, MULTIPLIER_BOUNDS.min, MULTIPLIER_BOUNDS.max);
  }
  return { multipliers: out, n: usable.length };
}

/** §2 empirical-Bayes shrinkage: (n·athlete + k·cohort) / (n + k). */
export function shrinkageBlend(
  athlete: TankLevels,
  n: number,
  cohort: TankLevels,
  k = SHRINKAGE_K,
): TankLevels {
  const out = neutralMultipliers();
  for (const t of TANKS) {
    out[t as Tank] = (n * athlete[t as Tank] + k * cohort[t as Tank]) / (n + k);
  }
  return out;
}

export interface LearnedMultipliers {
  multipliers: TankLevels;
  source: "v1_defaults" | "cohort_only" | "blended";
  n: number;
  cohortUsed: boolean;
  explanation: string;
  version: string;
}

/**
 * §2 — the full stack: personal estimate, cohort prior, gates, shrinkage,
 * bounds and the ±5%/week change cap. Zero data → neutral (identical to v1).
 */
export function learnMultipliers(input: {
  scored: { score: number; restDays: number; tankLevelsAtSession: TankLevels | null }[];
  cohort?: CohortEstimate | null;
  /** Last week's multipliers, for the ±5% change cap. */
  previous?: TankLevels | null;
  bestRestDays?: number | null;
}): LearnedMultipliers {
  const cohortUsable = cohortIsUsable(input.cohort);
  const cohortMul = cohortUsable
    ? boundAll(input.cohort!.multipliers)
    : neutralMultipliers();

  const personal = personalMultipliers(input.scored ?? []);
  const personalUsable = personal.n >= PERSONAL_MIN_SESSIONS;

  let raw: TankLevels;
  let source: LearnedMultipliers["source"];
  if (personalUsable && cohortUsable) {
    raw = shrinkageBlend(personal.multipliers, personal.n, cohortMul);
    source = "blended";
  } else if (personalUsable) {
    raw = shrinkageBlend(personal.multipliers, personal.n, neutralMultipliers());
    source = "blended";
  } else if (cohortUsable) {
    raw = cohortMul;
    source = "cohort_only";
  } else {
    raw = neutralMultipliers();
    source = "v1_defaults";
  }

  const bounded = boundAll(raw);
  const capped = input.previous ? capWeeklyChange(input.previous, bounded) : bounded;

  const best = input.bestRestDays;
  const explanation = source === "v1_defaults"
    ? "Standard spacing until we have your sessions."
    : source === "cohort_only"
    ? "Starting from what works for athletes like you."
    : best && best > 0
    ? `Your best sessions came after ${best} days off — keeping that.`
    : "Tuned to how your last sessions went.";

  return {
    multipliers: capped,
    source,
    n: personal.n,
    cohortUsed: cohortUsable,
    explanation,
    version: TCS_PERSONALIZATION_VERSION,
  };
}

export function boundAll(m: TankLevels): TankLevels {
  const out = neutralMultipliers();
  for (const t of TANKS) {
    const v = m?.[t as Tank];
    out[t as Tank] = Number.isFinite(v)
      ? clamp(v as number, MULTIPLIER_BOUNDS.min, MULTIPLIER_BOUNDS.max)
      : 1;
  }
  return out;
}

/** §2 — nothing jumps: at most ±5% of the previous value per week. */
export function capWeeklyChange(previous: TankLevels, next: TankLevels): TankLevels {
  const out = neutralMultipliers();
  for (const t of TANKS) {
    const prev = Number.isFinite(previous?.[t as Tank]) ? (previous[t as Tank] as number) : 1;
    const want = Number.isFinite(next?.[t as Tank]) ? (next[t as Tank] as number) : 1;
    const lo = prev * (1 - WEEKLY_CHANGE_CAP);
    const hi = prev * (1 + WEEKLY_CHANGE_CAP);
    out[t as Tank] = clamp(clamp(want, lo, hi), MULTIPLIER_BOUNDS.min, MULTIPLIER_BOUNDS.max);
  }
  return out;
}

/* ------------------------------------------------------- best future outcome */

export interface CandidateDay {
  date: string;
  /** Full rest days from the last lift to this date. */
  restDays: number;
  /** Floors and hard rules already cleared for this date. */
  allowedByFloors: boolean;
  gameOnDay?: boolean | null;
  /** Quality tracks this date would expose. */
  qualityTracks?: string[] | null;
  /** The block's goal tracks for the week. */
  blockGoalTracks?: string[] | null;
}

export interface DayPick {
  date: string | null;
  restDays: number | null;
  predictedSOS: number | null;
  reason: string;
  considered: number;
}

/**
 * §2 — among the days the floors allow, pick the highest predicted SOS inside
 * the 14-day horizon. Games, block goals and ≥1 weekly exposure per quality
 * track are respected. Ties go to the 3-day default. Fully deterministic.
 */
export function pickBestDay(input: {
  today: string;
  candidates: CandidateDay[];
  multipliers: TankLevels;
  /** Tracks already exposed this week — a track missing here is owed one. */
  tracksExposedThisWeek?: string[] | null;
  horizonDays?: number;
}): DayPick {
  const horizon = input.horizonDays ?? OUTCOME_HORIZON_DAYS;
  const last = isValidDate(input.today) ? addDays(input.today, horizon) : null;
  const owed = new Set(
    (input.candidates.flatMap((c) => c.blockGoalTracks ?? [])).filter(
      (t) => !(input.tracksExposedThisWeek ?? []).includes(t),
    ),
  );

  const eligible = (input.candidates ?? [])
    .filter(
      (c) =>
        c &&
        isValidDate(c.date) &&
        c.allowedByFloors &&
        !c.gameOnDay &&
        (last === null || c.date <= last),
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (eligible.length === 0) {
    return { date: null, restDays: null, predictedSOS: null, reason: "No day clears the floors inside the horizon.", considered: 0 };
  }

  const scoreOf = (c: CandidateDay): number => {
    let s = predictedSOS(c.restDays, input.multipliers);
    // Block goals and owed quality tracks are part of the pick, not a tiebreak.
    const tracks = c.qualityTracks ?? [];
    if (tracks.some((t) => owed.has(t))) s += 0.05;
    if (tracks.some((t) => (c.blockGoalTracks ?? []).includes(t))) s += 0.02;
    return s;
  };

  let best = eligible[0];
  let bestScore = scoreOf(best);
  for (const c of eligible.slice(1)) {
    const s = scoreOf(c);
    const better = s > bestScore + 1e-9;
    const tie = Math.abs(s - bestScore) <= 1e-9;
    // Tie → the 3-day default wins; then the earlier date.
    const tieWins = tie &&
      c.restDays === DEFAULT_REST_DAYS &&
      best.restDays !== DEFAULT_REST_DAYS;
    if (better || tieWins) {
      best = c;
      bestScore = s;
    }
  }

  return {
    date: best.date,
    restDays: best.restDays,
    predictedSOS: Number(bestScore.toFixed(6)),
    reason: best.restDays === DEFAULT_REST_DAYS
      ? "Standard spacing fits your week best."
      : `Best predicted session after ${best.restDays} days off.`,
    considered: eligible.length,
  };
}

/**
 * Predicted SOS for a rest-day count under the learned multipliers.
 * Peaks at the athlete's effective rest requirement, then flattens off.
 */
export function predictedSOS(restDays: number, multipliers: TankLevels): number {
  if (!Number.isFinite(restDays) || restDays < 0) return 0;
  const m = boundAll(multipliers);
  const mean = (m.nerve + m.muscle + m.connective + m.arm) / 4;
  const peak = DEFAULT_REST_DAYS * mean;
  const gap = restDays - peak;
  const penalty = gap < 0 ? Math.abs(gap) * 0.12 : gap * 0.04;
  return clamp(0.85 - penalty, 0, 1);
}
