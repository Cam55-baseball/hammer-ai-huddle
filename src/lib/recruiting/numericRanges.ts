/**
 * Paired min/max dropdown options for every numeric recruiting-standard field.
 *
 * Scouts never type a number. They pick a floor, a ceiling, both (a range), or
 * the same value on both sides (an exact match). Each field gets an open-ended
 * bookend on the outer edge — "<3'" on the minimum side, "8'+" on the maximum
 * side — so a pick at the edge means "no bound in that direction" rather than a
 * hard cut that silently excludes outliers.
 */
import type { StandardOperator } from "./standardsMatching";

export interface RangeOption {
  /** Numeric value stored on the criterion. Sentinels are never stored. */
  readonly value: number;
  readonly label: string;
  /** Open-ended bookend — selecting it applies no bound on that side. */
  readonly unbounded?: boolean;
}

export interface RangeOptions {
  readonly min: readonly RangeOption[];
  readonly max: readonly RangeOption[];
  /** Short helper shown under the pair. */
  readonly hint: string;
}

/** Sentinel values, kept far outside any real measurement. */
export const NO_MIN = -1;
export const NO_MAX = 1_000_000;

function seq(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  const decimals = step < 1 ? 1 : 0;
  for (let v = from; v <= to + 1e-9; v += step) out.push(Number(v.toFixed(decimals)));
  return out;
}

/** 74 → 6'2" */
export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

function bookendMin(label: string): RangeOption {
  return { value: NO_MIN, label, unbounded: true };
}
function bookendMax(label: string): RangeOption {
  return { value: NO_MAX, label, unbounded: true };
}

function pair(
  values: readonly number[],
  label: (v: number) => string,
  minBookend: string,
  maxBookend: string,
  hint: string,
): RangeOptions {
  const opts = values.map((v) => ({ value: v, label: label(v) }));
  return {
    min: [bookendMin(minBookend), ...opts],
    max: [...opts, bookendMax(maxBookend)],
    hint,
  };
}

const HEIGHT_VALUES = seq(36, 96, 1); // 3'0" through 8'0", every single inch
const GRADE_VALUES = seq(20, 80, 5); // scouting 20-80 scale

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_VALUES = seq(CURRENT_YEAR - 2, CURRENT_YEAR + 10, 1);

/** Options for a field, or null when the field is not numeric. */
export function rangeOptionsFor(fieldKey: string): RangeOptions | null {
  switch (fieldKey) {
    case "height_inches":
      return pair(HEIGHT_VALUES, formatHeight, "<3'", "8'+", "Every inch from 3'0\" to 8'0\".");
    case "weight":
      return pair(seq(60, 350, 5), (v) => `${v} lbs`, "<60 lbs", "350+ lbs", "5 lb steps.");
    case "age":
      return pair(seq(6, 30, 1), (v) => `${v} yrs`, "<6 yrs", "30+ yrs", "Whole years, from date of birth.");
    case "gpa":
      return pair(seq(1, 5, 0.1), (v) => v.toFixed(1), "<1.0", "5.0+", "Tenths of a point.");
    case "graduation_year":
      return pair(GRAD_VALUES, (v) => String(v), `Before ${GRAD_VALUES[0]}`, `${GRAD_VALUES[GRAD_VALUES.length - 1]}+`, "Class year.");
    default:
      return null;
  }
}

/** Grade/metric fields all share the 20-80 scale. */
export const GRADE_RANGE: RangeOptions = {
  min: [bookendMin("Any"), ...GRADE_VALUES.map((v) => ({ value: v, label: String(v) }))],
  max: [...GRADE_VALUES.map((v) => ({ value: v, label: String(v) })), bookendMax("80+")],
  hint: "20-80 scouting scale. Official grades only — never self-reported.",
};

export function optionsForField(fieldKey: string, kind: string): RangeOptions | null {
  if (kind === "grade") return GRADE_RANGE;
  return rangeOptionsFor(fieldKey);
}

export interface RangeCriterion {
  readonly operator: StandardOperator;
  readonly value: number;
}

function isBound(v: number | null): v is number {
  return v !== null && v !== NO_MIN && v !== NO_MAX;
}

/**
 * Turn a min/max pick into the criteria rows that express it.
 *  - min only            → at least
 *  - max only            → at most
 *  - same on both sides  → equals (one row)
 *  - true range          → at least + at most (two rows)
 */
export function rangeToCriteria(min: number | null, max: number | null): RangeCriterion[] {
  const lo = isBound(min) ? min : null;
  const hi = isBound(max) ? max : null;
  if (lo === null && hi === null) return [];
  if (lo !== null && hi !== null) {
    if (lo === hi) return [{ operator: "eq", value: lo }];
    if (lo > hi) return [];
    return [
      { operator: "gte", value: lo },
      { operator: "lte", value: hi },
    ];
  }
  if (lo !== null) return [{ operator: "gte", value: lo }];
  return [{ operator: "lte", value: hi as number }];
}

/** True when the pair is backwards (min above max) — blocks the add. */
export function isInvertedRange(min: number | null, max: number | null): boolean {
  return isBound(min) && isBound(max) && min > max;
}
