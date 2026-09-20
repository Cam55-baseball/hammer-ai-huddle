// Tissue Cost Scheduler v1 — versioned config + thresholds derived by construction.
// Spec §3.1–§3.3. Thresholds are NEVER hand-typed: they are computed by running
// the reference cases through the same tank math the scheduler uses.

import { canonicalJson, fnv1a64Hex } from "../../determinism/globalDeterminismLock.ts";
import {
  type CheckIn,
  type DaySchedule,
  type Profile,
  type SessionClass,
  TANKS,
  type TankLevels,
  type TcsConfig,
} from "./types.ts";
import { addLevels, applyCostMul, dayModifiers, decay, liftCost, runTanks } from "./tanks.ts";
import { computeBaseline, judgedLevels } from "./baseline.ts";

export const TCS_VERSION = "tcs_v1";

export const TCS_CONFIG: TcsConfig = Object.freeze({
  configVersion: "tcs_config_v1",

  // §3 half-lives (days)
  halfLives: Object.freeze({ nerve: 1.0, muscle: 1.5, connective: 2.5, arm: 1.5 }),

  // §3.1 starting cost table (E3 — Hammers method, tunable)
  costs: Object.freeze({
    lift_H_standard: { nerve: 40, muscle: 30, connective: 20, arm: 5 },
    lift_H_double_eccentric: { nerve: 30, muscle: 50, connective: 25, arm: 5 },
    lift_M: { nerve: 20, muscle: 20, connective: 10, arm: 3 },
    lift_L: { nerve: 5, muscle: 5, connective: 10, arm: 0 },
    jumps_tier1_per10: { nerve: 1, muscle: 1, connective: 3, arm: 0 },
    jumps_tier2_per10: { nerve: 2, muscle: 3, connective: 5, arm: 0 },
    jumps_tier3_per10: { nerve: 6, muscle: 3, connective: 8, arm: 0 },
    sprint_per100yd: { nerve: 8, muscle: 4, connective: 6, arm: 0 },
    game_position: { nerve: 15, muscle: 20, connective: 20, arm: 10 },
    game_catcher: { nerve: 15, muscle: 30, connective: 25, arm: 15 },
    game_starting_pitcher: { nerve: 20, muscle: 15, connective: 15, arm: 40 },
    practice_per60min_moderate: { nerve: 8, muscle: 10, connective: 10, arm: 8 },
    // NOT in the owner table — conservative Hammers default for standalone
    // high-intent throwing outside games. Tunable.
    throws_per25_max_intent: { nerve: 2, muscle: 2, connective: 2, arm: 8 },
  }),

  referenceHardSets: 6,
  hardSetsBounds: Object.freeze({ min: 0.7, max: 1.3 }),

  // Not in the owner table — practice intensity scaling around the "moderate" row.
  practiceIntensityFactor: Object.freeze({ light: 0.6, moderate: 1.0, high: 1.4 }),

  // §3.2 modifiers
  modifiers: Object.freeze({
    poorSleepOrSorenessHalfLife: 1.2,
    painCostMultiplier: 1.5,
    growthModeConnectiveHalfLife: 1.25,
    trainingAgeCost: Object.freeze({
      beginner: 1.15,
      developing: 1.15,
      intermediate: 1.0,
      advanced: 1.0,
      elite: 0.9,
      professional: 0.9,
    }),
    noveltyMuscleCost: 1.3,
    halfLifeMultiplierBounds: Object.freeze({ min: 0.9, max: 1.5 }),
    costMultiplierBounds: Object.freeze({ min: 0.9, max: 1.5 }),
  }),

  headroom: 1.15,

  // §4 floors (full rest days) — v1.2 Step 6 decision 2 restores the original
  // doctrine's "larger requirement of the two" rule:
  //   H -> H/M = 3, H -> L = 2, M -> H = 3, M -> M/L = 2, L -> anything = 2.
  //   in-season / post-season = 2 for all.
  floors: Object.freeze({
    offseasonAfterH: 3,
    offseasonAfterML: 2,
    /** M -> H also needs the full 3 days (Step 6 decision 2). */
    offseasonAfterMToH: 3,
    inSeasonBetweenLifts: 2,
  }),

  // §4 ceiling (full rest days)
  ceilingRestDays: Object.freeze({ offseason: 5, inSeason: 4 }),

  // v1.2 §B1.5 on-ramp — easing back in after time off.
  onRamp: Object.freeze({
    triggerGapDays: 14,
    windowDays: 14,
    longGapDays: 28,
    longWindowDays: 28,
    cap: "M" as SessionClass,
  }),

  // 60 days, not 28: the on-ramp rule (v1.2 §B1.5) has to be able to see a
  // lay-off of 28 days or more. Tank half-lives are <= 2.5 days, so the extra
  // history contributes <0.1% to any level.
  historyWindowDays: 60,
  nextHeavyHorizonDays: 10,

  // v1.2 §A — "load above your normal"
  baselineWindowDays: 28,
  baselineCapPracticeMinutes: 120,
  baselineSubtraction: false,
}) as TcsConfig;

/** v1.2 §A calibration: the same config with "load above your normal" ON. */
export const TCS_CONFIG_V12: TcsConfig = Object.freeze({
  ...TCS_CONFIG,
  baselineSubtraction: true,
}) as TcsConfig;

export const TCS_CONFIG_HASH = fnv1a64Hex(canonicalJson(TCS_CONFIG));

/* ---------------------------------------------------------------- reference cases */

const REF_PROFILE_OFF: Profile = {
  age: 17,
  growthMode: false,
  trainingAgeBand: "advanced",
  position: "position",
  phase: "offseason",
  isStartingPitcher: false,
};

const REF_PROFILE_IN: Profile = { ...REF_PROFILE_OFF, phase: "in_season" };

const NO_CHECKINS = new Map<string, CheckIn>();

function practice(date: string): DaySchedule {
  return { date, practiceMinutes: 60, practiceIntensity: "moderate" };
}

function gameDay(date: string): DaySchedule {
  return { date, games: { role: "position", count: 1 } };
}

/**
 * v1.2 §A — baseline_k = c/(1−r) is the steady state of the athlete's routine
 * load, i.e. it assumes the routine has been running for a long time. The
 * reference cases therefore start from that steady state: 28 routine days run
 * in before the reference week. Without the run-in the simulated levels are
 * still climbing from zero, every judged level lands at 0 and the derived
 * thresholds collapse. This aligns the simulation with the baseline
 * definition; it does not change any number by hand.
 */
function withRunIn(first: string, routine: (d: string) => DaySchedule, history: DaySchedule[]): DaySchedule[] {
  const run: DaySchedule[] = [];
  for (let i = TCS_CONFIG.baselineWindowDays; i >= 1; i--) run.push(routine(addDaysIso(first, -i)));
  return [...run, ...history];
}

function addDaysIso(date: string, delta: number): string {
  const t = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * REF-OFF (v1.2 §A, redefined): 60-min moderate practice every day Mon–Fri,
 * H lift Monday after practice → next H Friday after practice (3 full rest days).
 * Friday now carries its practice, so the threshold is measured on a normal
 * training day instead of a rest day.
 */
export const REF_OFF = {
  __runIn: true as const,
  profile: REF_PROFILE_OFF,
  history: [
    { ...practice("2026-01-05"), lift: { class: "H" as SessionClass, method: "standard" as const } },
    practice("2026-01-06"),
    practice("2026-01-07"),
    practice("2026-01-08"),
  ],
  today: "2026-01-09",
  todayDay: practice("2026-01-09") as DaySchedule | null,
};

/** REF-IN: daily games, H lift post-game Day 1. Next lift Day 4 post-game (2 full rest days). */
export const REF_IN = {
  __runIn: true as const,
  profile: REF_PROFILE_IN,
  history: [
    { ...gameDay("2026-05-04"), lift: { class: "H" as SessionClass, method: "standard" as const } },
    gameDay("2026-05-05"),
    gameDay("2026-05-06"),
  ],
  today: "2026-05-07",
  todayDay: gameDay("2026-05-07") as DaySchedule | null,
};

/** REF-M: offseason, practice Mon–Thu, M lift Mon. Next lift Thu (2 full rest days). */
export const REF_M = {
  __runIn: true as const,
  profile: REF_PROFILE_OFF,
  history: [
    { ...practice("2026-01-05"), lift: { class: "M" as SessionClass } },
    practice("2026-01-06"),
    practice("2026-01-07"),
  ],
  today: "2026-01-08",
  todayDay: practice("2026-01-08") as DaySchedule | null,
};

/** REF-L: same week with an L session. Next lift 2 full rest days later. */
export const REF_L = {
  __runIn: true as const,
  profile: REF_PROFILE_OFF,
  history: [
    { ...practice("2026-01-05"), lift: { class: "L" as SessionClass } },
    practice("2026-01-06"),
    practice("2026-01-07"),
  ],
  today: "2026-01-08",
  todayDay: practice("2026-01-08") as DaySchedule | null,
};

type RefCase = {
  profile: Profile;
  history: DaySchedule[];
  today: string;
  todayDay: DaySchedule | null;
};

function refHistory(ref: RefCase): DaySchedule[] {
  const first = ref.history[0]?.date ?? ref.today;
  const routine = ref.profile.phase === "in_season" ? gameDay : practice;
  return withRunIn(first, routine, ref.history);
}

function rawLevelsAt(ref: RefCase, cfg: TcsConfig): TankLevels {
  return runTanks({
    days: cfg.baselineSubtraction ? refHistory(ref) : ref.history,
    today: ref.today,
    todayDay: ref.todayDay,
    profile: ref.profile,
    checkInByDate: NO_CHECKINS,
    config: cfg,
  }).levels;
}

/** v1.2 §A — reference cases are measured on load ABOVE the athlete's own normal. */
export function refBaseline(ref: RefCase, cfg: TcsConfig = TCS_CONFIG_V12): TankLevels {
  return computeBaseline(
    refHistory(ref),
    ref.todayDay ? [ref.todayDay] : [],
    ref.today,
    cfg,
  ).baseline;
}

function levelsAt(ref: RefCase, cfg: TcsConfig): TankLevels {
  const raw = rawLevelsAt(ref, cfg);
  return cfg.baselineSubtraction ? judgedLevels(raw, refBaseline(ref, cfg)) : raw;
}

function withHeadroom(levels: TankLevels, cfg: TcsConfig): TankLevels {
  const out = { nerve: 0, muscle: 0, connective: 0, arm: 0 } as TankLevels;
  for (const t of TANKS) out[t] = levels[t] * cfg.headroom;
  return out;
}

export interface DerivedThresholds {
  /** Per class, per phase family. */
  H: { offseason: TankLevels; in_season: TankLevels };
  M: TankLevels;
  L: TankLevels;
  /** In-season: projected level at the next game start must stay under this. */
  gameReadyLine: TankLevels;
}

function deriveGameReadyLine(cfg: TcsConfig): TankLevels {
  // The REF-IN Day-4 post-game lift is legal by owner law, so the level it
  // produces at the next game start defines the line (plus headroom).
  const atLift = rawLevelsAt(REF_IN, cfg);
  const mods = dayModifiers(REF_IN.profile, undefined, cfg);
  const afterLift = addLevels(
    atLift,
    applyCostMul(
      liftCost({ date: REF_IN.today, lift: { class: "H", method: "standard" } }, cfg),
      mods.costMul,
    ),
  );
  const projected = decay(afterLift, cfg, mods.halfLifeMul);
  return withHeadroom(
    cfg.baselineSubtraction ? judgedLevels(projected, refBaseline(REF_IN, cfg)) : projected,
    cfg,
  );
}

export function deriveThresholds(cfg: TcsConfig): DerivedThresholds {
  return Object.freeze({
    H: Object.freeze({
      offseason: Object.freeze(withHeadroom(levelsAt(REF_OFF, cfg), cfg)),
      in_season: Object.freeze(withHeadroom(levelsAt(REF_IN, cfg), cfg)),
    }),
    M: Object.freeze(withHeadroom(levelsAt(REF_M, cfg), cfg)),
    L: Object.freeze(withHeadroom(levelsAt(REF_L, cfg), cfg)),
    gameReadyLine: Object.freeze(deriveGameReadyLine(cfg)),
  }) as DerivedThresholds;
}

export const TCS_THRESHOLDS: DerivedThresholds = deriveThresholds(TCS_CONFIG);

/** v1.2 §A calibration thresholds (derived with baseline subtraction ON). */
export const TCS_THRESHOLDS_V12: DerivedThresholds = deriveThresholds(TCS_CONFIG_V12);

export const TCS_THRESHOLDS_HASH = fnv1a64Hex(canonicalJson(TCS_THRESHOLDS));

/** Tanks a class actually loads (non-zero cost in the table). */
export function tanksLoadedBy(cls: SessionClass): readonly ("nerve" | "muscle" | "connective" | "arm")[] {
  const row =
    cls === "H"
      ? TCS_CONFIG.costs.lift_H_standard
      : cls === "M"
      ? TCS_CONFIG.costs.lift_M
      : TCS_CONFIG.costs.lift_L;
  return TANKS.filter((t) => (row as unknown as Record<string, number>)[t] > 0);
}

export function thresholdFor(
  cls: SessionClass,
  phase: Profile["phase"],
  thresholds: DerivedThresholds = TCS_THRESHOLDS,
): TankLevels {
  if (cls === "M") return thresholds.M;
  if (cls === "L") return thresholds.L;
  return phase === "in_season" || phase === "post_season"
    ? thresholds.H.in_season
    : thresholds.H.offseason;
}
