// v1.2 §B — one timeline. Shared types.
// Pure data only: no clock, no I/O, no imports from the app.

import type { Phase, SessionClass } from "../tissueCost/types.ts";

export type BlockName =
  | "Build the Base"
  | "Absorb"
  | "Sport Ramp"
  | "Speed & Power"
  | "Sharpen";

export type RecentOverall = "none" | "light" | "moderate" | "heavy";
export type ThrowingStatus =
  | "not_throwing"
  | "catch_play"
  | "long_toss"
  | "bullpens"
  | "games";

/** v1.2 §B1.4 — last four weeks, quick pickers. */
export interface RecentTraining {
  overall: RecentOverall;
  liftingDaysPerWeek: number;
  throwingStatus: ThrowingStatus;
  practicesPerWeek: number;
  /** Days since the athlete last did anything loaded. Unknown → null. */
  daysSinceLastLoadedLift?: number | null;
}

/** v1.2 §B1.1 — any one of the three is enough. */
export interface PhaseAnchor {
  phase: Phase;
  daysIntoPhase?: number | null;
  phaseStartDate?: string | null;
  blockName?: BlockName | null;
}

/** v1.2 §B1.3 — planned off days. */
export interface PlannedOffDays {
  /** "14 days of complete rest" — spread from the arc start when no dates given. */
  count?: number | null;
  /** Specific YYYY-MM-DD dates (vacation, holidays, shutdown weeks). */
  dates?: string[] | null;
}

export interface SeasonDates {
  /** First game of the season. */
  firstGameDate?: string | null;
  /** Offseason length in weeks, when the athlete gives it directly. */
  offseasonWeeks?: number | null;
}

export interface OnboardingInput {
  /** The day onboarding is filled in (athlete-local YYYY-MM-DD). */
  asOf: string;
  anchor: PhaseAnchor;
  season?: SeasonDates | null;
  offDays?: PlannedOffDays | null;
  recent: RecentTraining;
}

export interface BlockPlan {
  name: BlockName;
  startDate: string;
  endDate: string;
  /** Calendar days, off days included. */
  lengthDays: number;
  /** Loadable days after the off days are removed. */
  workingDays: number;
  minimumDays: number;
}

export interface OnboardingResult {
  phase: Phase;
  phaseStartDate: string;
  daysIntoPhase: number;
  currentBlock: BlockName;
  dayInBlock: number;
  arc: BlockPlan[];
  offDayDates: string[];
  /** Inclusive last date of the on-ramp, or null. Matches the TCS on-ramp cap. */
  onRampUntil: string | null;
  /**
   * On-ramp length in days. Taken from the Step 5 TCS on-ramp config
   * (14 / 28), NOT from the v1.2 "2 weeks / 3 weeks" wording — the owner
   * required the two to match and Step 5 is the shipped rule.
   */
  onRampDays: number;
  /** Highest class allowed while the on-ramp runs. */
  onRampCap: SessionClass | null;
  notes: string[];
}

export type TimelineChangeKind =
  | "game_added"
  | "game_cancelled"
  | "practice_added"
  | "off_day_added"
  | "travel_added"
  | "onboarding";

export interface TimelineChange {
  kind: TimelineChangeKind;
  date: string;
  /** Free-form label used in the card reason (e.g. weekday name, opponent). */
  label?: string | null;
}

export interface PlannedDay {
  date: string;
  /** What the day is for. "rest" never leaves a card empty — it carries mobility. */
  slot: "lift" | "rest" | "off" | "mobility_only";
  class: SessionClass | null;
  reason: string;
}

export interface ReplanResult {
  days: PlannedDay[];
  changeReason: string | null;
}
