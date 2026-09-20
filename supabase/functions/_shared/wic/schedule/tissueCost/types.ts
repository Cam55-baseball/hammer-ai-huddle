// Tissue Cost Scheduler v1 — shared types.
// Spec: docs/wic/tissue-cost-scheduler-v1.md
// Stage S1: pure code, not wired to anything.

export const TANKS = ["nerve", "muscle", "connective", "arm"] as const;
export type Tank = (typeof TANKS)[number];
export type TankLevels = Record<Tank, number>;

export type SessionClass = "H" | "M" | "L";
export type AllowedClass = SessionClass | "none";

export type Phase = "offseason" | "pre_season" | "in_season" | "post_season";

export type TrainingAgeBand =
  | "beginner"
  | "developing"
  | "intermediate"
  | "advanced"
  | "elite"
  | "professional";

export type GameRole = "position" | "catcher" | "starting_pitcher";

export type LiftMethod = "standard" | "double_eccentric";

export interface LiftEntry {
  class: SessionClass;
  method?: LiftMethod | null;
  /** Prescribed hard sets. Missing → reference hard sets (factor 1.0). */
  hardSets?: number | null;
  /** Prescribed counts as done unless explicitly marked skipped. */
  skipped?: boolean | null;
  /** Main movement not performed in the last 28 days. */
  novelty?: boolean | null;
}

export interface GameEntry {
  role?: GameRole | null;
  count?: number | null;
  tournament?: boolean | null;
  doubleheader?: boolean | null;
}

export interface JumpContacts {
  tier1?: number | null;
  tier2?: number | null;
  tier3?: number | null;
}

export type PracticeIntensity = "light" | "moderate" | "high";

/** One calendar day of known or planned work. Used for history and forward calendar. */
export interface DaySchedule {
  date: string; // YYYY-MM-DD, athlete-local
  lift?: LiftEntry | null;
  games?: GameEntry | null;
  practiceMinutes?: number | null;
  practiceIntensity?: PracticeIntensity | null;
  jumpContacts?: JumpContacts | null;
  maxSprintYards?: number | null;
  maxIntentThrows?: number | null;
  /** This athlete is the starting pitcher on this date. */
  pitcherStartDay?: boolean | null;
  /** Pitch Smart mandated rest day (blocks pitching / high-intent throwing). */
  pitchSmartRestDay?: boolean | null;
  /** Travel day — no sport cost, kept for schedule realism. */
  travel?: boolean | null;
}

export interface PainFlag {
  region?: string | null;
  tank?: Tank | null;
  blocksLoadedWork?: boolean | null;
}

export interface CheckIn {
  date: string;
  poorSleep?: boolean | null;
  highSoreness?: boolean | null;
  pain?: PainFlag[] | null;
}

export interface Profile {
  athleteId?: string | null;
  age?: number | null;
  growthMode?: boolean | null;
  trainingAgeBand?: TrainingAgeBand | null;
  sport?: string | null;
  position?: GameRole | null;
  phase: Phase;
  blockId?: string | null;
  isStartingPitcher?: boolean | null;
  /** Highest class the phase template calls for today. Decision never exceeds it. */
  phaseTemplateClass?: AllowedClass | null;
}

export type Timing = "after_skill_work" | "post_game" | "none";

export interface Decision {
  allowedClass: AllowedClass;
  timing: Timing;
  nextHeavyDate: string | null;
  tankLevels: TankLevels;
  reasons: string[];
  floorsApplied: string[];
  /** Ceiling rule fired: tanks would have delayed the lift past the ceiling. */
  loadPatternSignal: boolean;
  /**
   * v1.2 §B1.5 on-ramp: the last calendar date (inclusive) on which the class
   * stays capped after a break from loaded lifting. null = not on an on-ramp.
   */
  onRampUntil: string | null;
  diagnostics: string[];
  version: string;
  configHash: string;
  inputsHash: string;
}

export interface CostRow {
  nerve: number;
  muscle: number;
  connective: number;
  arm: number;
}

export interface TcsConfig {
  readonly configVersion: string;
  readonly halfLives: TankLevels;
  readonly costs: {
    lift_H_standard: CostRow;
    lift_H_double_eccentric: CostRow;
    lift_M: CostRow;
    lift_L: CostRow;
    jumps_tier1_per10: CostRow;
    jumps_tier2_per10: CostRow;
    jumps_tier3_per10: CostRow;
    sprint_per100yd: CostRow;
    game_position: CostRow;
    game_catcher: CostRow;
    game_starting_pitcher: CostRow;
    practice_per60min_moderate: CostRow;
    /** Not in the owner table — tunable Hammers default (E3). */
    throws_per25_max_intent: CostRow;
  };
  readonly referenceHardSets: number;
  readonly hardSetsBounds: { min: number; max: number };
  readonly practiceIntensityFactor: Record<PracticeIntensity, number>;
  readonly modifiers: {
    poorSleepOrSorenessHalfLife: number;
    painCostMultiplier: number;
    growthModeConnectiveHalfLife: number;
    trainingAgeCost: Record<TrainingAgeBand, number>;
    noveltyMuscleCost: number;
    halfLifeMultiplierBounds: { min: number; max: number };
    costMultiplierBounds: { min: number; max: number };
  };
  readonly headroom: number;
  readonly floors: {
    offseasonAfterH: number;
    offseasonAfterML: number;
    inSeasonBetweenLifts: number;
  };
  readonly ceilingRestDays: { offseason: number; inSeason: number };
  /** v1.2 §B1.5 — easing back in after time off. */
  readonly onRamp: {
    /** Days since the last completed loaded lift that starts an on-ramp. */
    triggerGapDays: number;
    /** On-ramp length after a trigger-length gap. */
    windowDays: number;
    /** Gap length that counts as a long lay-off. */
    longGapDays: number;
    /** On-ramp length after a long lay-off. */
    longWindowDays: number;
    /** Highest class allowed while on an on-ramp. */
    cap: SessionClass;
  };
  readonly historyWindowDays: number;
  readonly nextHeavyHorizonDays: number;
  /** v1.2 §A — window used for "your normal". */
  readonly baselineWindowDays: number;
  /** v1.2 §A — baseline cap: practice minutes a day at moderate intensity. */
  readonly baselineCapPracticeMinutes: number;
  /**
   * v1.2 §A — judge tanks on load above the athlete's own normal.
   * OFF by default: the calibration raises conflicts with invariant I3 and the
   * REF-M / REF-L goldens that need an owner decision (see
   * docs/wic/hammers-v1.2-addendum.md and the v1.2 report).
   */
  readonly baselineSubtraction: boolean;
}
