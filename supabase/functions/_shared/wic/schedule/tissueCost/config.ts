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

  // §4 floors (full rest days)
  floors: Object.freeze({
    offseasonAfterH: 3,
    offseasonAfterML: 2,
    inSeasonBetweenLifts: 2,
  }),

  // §4 ceiling (full rest days)
  ceilingRestDays: Object.freeze({ offseason: 5, inSeason: 4 }),

  historyWindowDays: 28,
  nextHeavyHorizonDays: 10,
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

/** REF-OFF: practice Mon–Thu, H lift Mon after practice. Next H allowed Fri (3 full rest days). */
export const REF_OFF = {
  profile: REF_PROFILE_OFF,
  history: [
    { ...practice("2026-01-05"), lift: { class: "H" as SessionClass, method: "standard" as const } },
    practice("2026-01-06"),
    practice("2026-01-07"),
    practice("2026-01-08"),
  ],
  today: "2026-01-09",
  todayDay: null as DaySchedule | null,
};

/** REF-IN: daily games, H lift post-game Day 1. Next lift Day 4 post-game (2 full rest days). */
export const REF_IN = {
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
  profile: REF_PROFILE_OFF,
  history: [
    { ...practice("2026-01-05"), lift: { class: "L" as SessionClass } },
    practice("2026-01-06"),
    practice("2026-01-07"),
  ],
  today: "2026-01-08",
  todayDay: practice("2026-01-08") as DaySchedule | null,
};

function levelsAt(ref: {
  profile: Profile;
  history: DaySchedule[];
  today: string;
  todayDay: DaySchedule | null;
}): TankLevels {
  return runTanks({
    days: ref.history,
    today: ref.today,
    todayDay: ref.todayDay,
    profile: ref.profile,
    checkInByDate: NO_CHECKINS,
    config: TCS_CONFIG,
  }).levels;
}

function withHeadroom(levels: TankLevels): TankLevels {
  const out = { nerve: 0, muscle: 0, connective: 0, arm: 0 } as TankLevels;
  for (const t of TANKS) out[t] = levels[t] * TCS_CONFIG.headroom;
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

function deriveGameReadyLine(): TankLevels {
  // The REF-IN Day-4 post-game lift is legal by owner law, so the level it
  // produces at the next game start defines the line (plus headroom).
  const atLift = levelsAt(REF_IN);
  const mods = dayModifiers(REF_IN.profile, undefined, TCS_CONFIG);
  const afterLift = addLevels(
    atLift,
    applyCostMul(
      liftCost({ date: REF_IN.today, lift: { class: "H", method: "standard" } }, TCS_CONFIG),
      mods.costMul,
    ),
  );
  return withHeadroom(decay(afterLift, TCS_CONFIG, mods.halfLifeMul));
}

export const TCS_THRESHOLDS: DerivedThresholds = Object.freeze({
  H: Object.freeze({
    offseason: Object.freeze(withHeadroom(levelsAt(REF_OFF))),
    in_season: Object.freeze(withHeadroom(levelsAt(REF_IN))),
  }),
  M: Object.freeze(withHeadroom(levelsAt(REF_M))),
  L: Object.freeze(withHeadroom(levelsAt(REF_L))),
  gameReadyLine: Object.freeze(deriveGameReadyLine()),
}) as DerivedThresholds;

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

export function thresholdFor(cls: SessionClass, phase: Profile["phase"]): TankLevels {
  if (cls === "M") return TCS_THRESHOLDS.M;
  if (cls === "L") return TCS_THRESHOLDS.L;
  return phase === "in_season" || phase === "post_season"
    ? TCS_THRESHOLDS.H.in_season
    : TCS_THRESHOLDS.H.offseason;
}
