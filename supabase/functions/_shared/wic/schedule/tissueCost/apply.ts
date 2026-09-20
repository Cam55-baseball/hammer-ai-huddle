// Tissue Cost Scheduler — stage S4. Turning a decision into today's plan.
//
// Pure: no database, no clock, no side effects. The generator calls this only
// when the `rest_day_calculator` switch resolves ON for that athlete. With the
// switch off nothing in this file is ever reached, so the card is unchanged.
//
// Two hard rules live here:
//   1. The calculator can only make a day EASIER. The CNS cap it returns is
//      never above the cap it was handed, and the movement classes it allows
//      are never wider than the class the decision allows.
//   2. A "none" day is never empty — it becomes the recovery-only day the
//      engine already certifies (mobility, arm care, movement prep).

import type { AllowedClass, Phase, Timing } from "./types.ts";

export const TCS_APPLY_VERSION = "tcs_apply_v1_0";

/**
 * Catalog `intensity_class` vocabulary, as it actually exists on the rows:
 * high, moderate, low, supplemental, maximal, supra_maximal, compound,
 * unilateral, elastic, arm_care, os_only — plus untagged (null).
 * Untagged rows are never blocked here: a labelling gap must not empty a card.
 */
/** Illegal below class H. */
export const HEAVY_CLASSES = ["supra_maximal", "maximal"] as const;
/** Illegal below class M — everything heavy, plus hard compound and elastic work. */
export const COMPOUND_CLASSES = [...HEAVY_CLASSES, "high", "compound", "elastic"] as const;
/**
 * A "none" day keeps only the tissue work: arm care, mobility, movement prep,
 * low-cost supplemental. Everything that loads a joint hard is off the board —
 * which is how the Recovery & Tissue card is built without ever being empty.
 */
export const LOADED_CLASSES = [
  ...COMPOUND_CLASSES,
  "moderate",
  "unilateral",
] as const;

export interface TcsApplyInput {
  allowedClass: AllowedClass;
  timing: Timing;
  nextHeavyDate: string | null;
  reasons: string[];
  fallbackUsed: boolean;
  /** Cap the engine already arrived at for today. Only ever lowered. */
  blockCnsCap: number;
  isGameDay: boolean;
  /** Athlete-local plan date, YYYY-MM-DD. Used for the weekday chip only. */
  planDate: string;
}

export interface TcsApplyResult {
  allowedClass: AllowedClass;
  /** Adjusted CNS cap. Never above `blockCnsCap`, never below 1. */
  cnsCap: number;
  /** True when today carries no lift at all. */
  removeLift: boolean;
  /** True when today becomes the recovery-only session. */
  recoveryOnly: boolean;
  /** Catalog intensity classes that may not appear today. */
  blockedIntensityClasses: string[];
  timing: Timing;
  /** One line the card shows about when to do the work. */
  timingNote: string | null;
  /** "Next heavy day: Thursday", or null when today already is one. */
  nextHeavyChip: string | null;
  /** One or two plain reasons, athlete language. */
  reasons: string[];
  fallbackUsed: boolean;
  version: string;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Weekday name for a YYYY-MM-DD date, date-only so no timezone can shift it. */
export function weekdayName(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAYS[dow] ?? null;
}

/**
 * Phase template ceiling. The decision never returns a class above this.
 *
 *   Offseason Q1–Q4 → H   (these blocks prescribe heavy / eccentric compounds)
 *   In-season        → M  (concentric strength primer, never a max day)
 *   Post-season      → L  (deload + tissue health)
 */
export function phaseTemplateClassFor(
  phase: Phase | string | null | undefined,
): AllowedClass {
  switch (String(phase ?? "")) {
    case "os_q1":
    case "os_q2":
    case "os_q3":
    case "os_q4":
    case "offseason":
    case "pre_season":
      return "H";
    case "in_season":
      return "M";
    case "post_season":
      return "L";
    default:
      return "M";
  }
}

/** How far the cap comes down for each class. Down only, floor of 1. */
export function capForClass(allowedClass: AllowedClass, blockCap: number): number {
  const base = Number.isFinite(blockCap) && blockCap > 0 ? Math.floor(blockCap) : 1;
  switch (allowedClass) {
    case "H":
      return base;
    case "M":
      return Math.max(1, base - 1);
    case "L":
      return Math.max(1, base - 2);
    default:
      return Math.max(1, base - 2);
  }
}

export function blockedClassesFor(allowedClass: AllowedClass): string[] {
  if (allowedClass === "H") return [];
  if (allowedClass === "M") return [...HEAVY_CLASSES];
  if (allowedClass === "L") return [...COMPOUND_CLASSES];
  return [...LOADED_CLASSES];
}

/** Trim to the first two reasons and make sure there is always at least one. */
function plainReasons(reasons: string[], allowedClass: AllowedClass): string[] {
  const cleaned = (Array.isArray(reasons) ? reasons : [])
    .map((r) => String(r ?? "").trim())
    .filter((r) => r.length > 0)
    .slice(0, 2);
  if (cleaned.length > 0) return cleaned;
  return [
    allowedClass === "none"
      ? "Your tissues need a full day back before the next load."
      : "Standard spacing today.",
  ];
}

export function applyDecision(input: TcsApplyInput): TcsApplyResult {
  const allowedClass: AllowedClass = (["H", "M", "L", "none"] as const).includes(
      input.allowedClass as any,
    )
    ? input.allowedClass
    : "none";

  const removeLift = allowedClass === "none";
  const cnsCap = Math.min(
    capForClass(allowedClass, input.blockCnsCap),
    Math.max(1, Math.floor(input.blockCnsCap || 1)),
  );

  // Timing. Never before a game: on a game day the work is stamped post-game,
  // whatever the decision said.
  const timing: Timing = removeLift
    ? "none"
    : input.isGameDay
    ? "post_game"
    : (input.timing === "post_game" ? "post_game" : "after_skill_work");

  const timingNote = removeLift
    ? "Recovery work — do it whenever it fits today."
    : timing === "post_game"
    ? "Do this after the game"
    : "Do this after your skill work";

  const heavyDay = weekdayName(input.nextHeavyDate);
  const nextHeavyChip = heavyDay && input.nextHeavyDate !== input.planDate
    ? `Next heavy day: ${heavyDay}`
    : null;

  return {
    allowedClass,
    cnsCap,
    removeLift,
    recoveryOnly: removeLift,
    blockedIntensityClasses: blockedClassesFor(allowedClass),
    timing,
    timingNote,
    nextHeavyChip,
    reasons: plainReasons(input.reasons, allowedClass),
    fallbackUsed: input.fallbackUsed === true,
    version: TCS_APPLY_VERSION,
  };
}
