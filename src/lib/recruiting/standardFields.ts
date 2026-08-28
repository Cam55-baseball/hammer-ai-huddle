/**
 * Field catalog for recruiting standards.
 *
 * Two kinds of fields:
 *  - profile facts (position, handedness, state, age, height, grad year…)
 *  - official grade metrics (only cv_measured / coach_evaluated ever count)
 *
 * The matcher (`standardsMatching.ts`) owns the rules. This file only
 * declares which fields an org may build criteria from, and how to shape
 * athlete rows into the matcher's input.
 */
import type {
  AthleteGrade,
  AthleteMatchInput,
  StandardOperator,
} from "./standardsMatching";

export type FieldKind = "text" | "number" | "grade";

export interface StandardField {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** Operators that make sense for this field. */
  readonly operators: readonly StandardOperator[];
  readonly hint?: string;
}

const TEXT_OPS: readonly StandardOperator[] = ["eq", "in"];
const NUM_OPS: readonly StandardOperator[] = ["gte", "lte", "eq"];

export const PROFILE_FIELDS: readonly StandardField[] = [
  { key: "position", label: "Position", kind: "text", operators: TEXT_OPS, hint: "e.g. RHP, SS, C" },
  { key: "primary_throwing_hand", label: "Throwing hand", kind: "text", operators: TEXT_OPS, hint: "right / left / both" },
  { key: "primary_batting_side", label: "Batting side", kind: "text", operators: TEXT_OPS, hint: "right / left / switch" },
  { key: "state", label: "State", kind: "text", operators: TEXT_OPS, hint: "two-letter code" },
  { key: "age", label: "Age", kind: "number", operators: NUM_OPS },
  { key: "height_inches", label: "Height (inches)", kind: "number", operators: NUM_OPS },
  { key: "weight", label: "Weight (lbs)", kind: "number", operators: NUM_OPS },
  { key: "graduation_year", label: "Grad year", kind: "number", operators: [...NUM_OPS, "in"] },
  { key: "gpa", label: "GPA", kind: "number", operators: NUM_OPS },
];

/** Official grade/metric columns on `vault_scout_grades`. */
export const GRADE_FIELDS: readonly StandardField[] = [
  { key: "overall_grade", label: "Overall grade", kind: "grade", operators: NUM_OPS },
  { key: "hitting_grade", label: "Hitting grade", kind: "grade", operators: NUM_OPS },
  { key: "power_grade", label: "Power grade", kind: "grade", operators: NUM_OPS },
  { key: "speed_grade", label: "Speed grade", kind: "grade", operators: NUM_OPS },
  { key: "throwing_grade", label: "Throwing grade", kind: "grade", operators: NUM_OPS },
  { key: "defense_grade", label: "Defense grade", kind: "grade", operators: NUM_OPS },
  { key: "fastball_grade", label: "Fastball grade", kind: "grade", operators: NUM_OPS },
  { key: "breaking_ball_grade", label: "Breaking ball grade", kind: "grade", operators: NUM_OPS },
  { key: "offspeed_grade", label: "Offspeed grade", kind: "grade", operators: NUM_OPS },
  { key: "control_grade", label: "Control grade", kind: "grade", operators: NUM_OPS },
  { key: "delivery_grade", label: "Delivery grade", kind: "grade", operators: NUM_OPS },
  { key: "rise_ball_grade", label: "Rise ball grade", kind: "grade", operators: NUM_OPS },
  { key: "leadership_grade", label: "Leadership grade", kind: "grade", operators: NUM_OPS },
  { key: "self_efficacy_grade", label: "Self-efficacy grade", kind: "grade", operators: NUM_OPS },
];

export const ALL_FIELDS: readonly StandardField[] = [...PROFILE_FIELDS, ...GRADE_FIELDS];

export const GRADE_COLUMNS: readonly string[] = GRADE_FIELDS.map((f) => f.key);

export function fieldByKey(key: string): StandardField | undefined {
  return ALL_FIELDS.find((f) => f.key === key);
}

export function fieldLabel(key: string): string {
  return fieldByKey(key)?.label ?? key;
}

export const OPERATOR_LABELS: Record<StandardOperator, string> = {
  eq: "equals",
  gte: "at least",
  lte: "at most",
  in: "one of",
};

export function describeCriterion(
  field: string,
  operator: StandardOperator,
  value: unknown,
): string {
  const rendered = Array.isArray(value) ? value.join(", ") : String(value);
  return `${fieldLabel(field)} ${OPERATOR_LABELS[operator]} ${rendered}`;
}

/** Age in whole years from an ISO date of birth. Null when unknown (a fail). */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export interface ProfileRow {
  id: string;
  full_name?: string | null;
  position?: string | null;
  primary_throwing_hand?: string | null;
  primary_batting_side?: string | null;
  state?: string | null;
  height_inches?: number | null;
  weight?: number | null;
  graduation_year?: number | null;
  gpa?: number | null;
  date_of_birth?: string | null;
}

export interface GradeRow {
  user_id: string;
  grade_source: string | null;
  [column: string]: unknown;
}

/** Flatten one grade row into per-metric grades the matcher understands. */
export function gradeRowToGrades(row: GradeRow): AthleteGrade[] {
  const source = row.grade_source ?? "";
  const out: AthleteGrade[] = [];
  for (const col of GRADE_COLUMNS) {
    const v = row[col];
    if (v === null || v === undefined) continue;
    out.push({ metric: col, value: v as number, grade_source: source });
  }
  return out;
}

export function buildMatchInput(
  profile: ProfileRow,
  grades: readonly AthleteGrade[],
): AthleteMatchInput {
  return {
    athlete_user_id: profile.id,
    profile: {
      position: profile.position ?? null,
      primary_throwing_hand: profile.primary_throwing_hand ?? null,
      primary_batting_side: profile.primary_batting_side ?? null,
      state: profile.state ?? null,
      age: ageFromDob(profile.date_of_birth),
      height_inches: profile.height_inches ?? null,
      weight: profile.weight ?? null,
      graduation_year: profile.graduation_year ?? null,
      gpa: profile.gpa ?? null,
    },
    grades,
  };
}

/** Parse the value a user typed into the shape the matcher expects. */
export function parseCriterionValue(
  raw: string,
  kind: FieldKind,
  operator: StandardOperator,
): number | string | Array<number | string> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (operator === "in") {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    return kind === "text" ? parts : parts.map(Number).filter((n) => Number.isFinite(n));
  }
  if (kind === "text") return trimmed;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}
