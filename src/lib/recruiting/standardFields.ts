/**
 * Field catalog for recruiting standards.
 *
 * Two kinds of fields:
 *  - profile facts (position, handedness, state, age, height, grad year…)
 *  - official grade metrics (only cv_measured / coach_evaluated ever count)
 *
 * Fields are tagged by the scouting ROLE they belong to and the SPORT(s) they
 * exist in, so building a pitcher standard never offers plate discipline and a
 * softball standard never offers "hold runners".
 *
 * The matcher (`standardsMatching.ts`) owns the rules. This file only
 * declares which fields an org may build criteria from, and how to shape
 * athlete rows into the matcher's input.
 */
import type {
  AthleteGrade,
  AthleteMatchInput,
  ScopedGrades,
  StandardOperator,
} from "./standardsMatching";

export type FieldKind = "text" | "number" | "grade";

/** Which tool set a standard grades against. */
export type RecruitingRole = "position_player" | "pitcher" | "two_way";
export type FieldRole = "position_player" | "pitcher";
export type StandardSport = "baseball" | "softball";

export const RECRUITING_ROLE_LABELS: Record<RecruitingRole, string> = {
  position_player: "Position player",
  pitcher: "Pitcher",
  two_way: "Two-way",
};

export interface StandardField {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** Operators that make sense for this field. */
  readonly operators: readonly StandardOperator[];
  readonly hint?: string;
  /** Roles this field belongs to. Omitted = every role (profile facts). */
  readonly roles?: readonly FieldRole[];
  /** Sports this field exists in. Omitted = both. */
  readonly sports?: readonly StandardSport[];
}

const TEXT_OPS: readonly StandardOperator[] = ["eq", "in"];
const NUM_OPS: readonly StandardOperator[] = ["gte", "lte", "eq"];

export const PROFILE_FIELDS: readonly StandardField[] = [
  { key: "position", label: "Position", kind: "text", operators: TEXT_OPS, hint: "e.g. RHP, SS, C" },
  { key: "primary_throwing_hand", label: "Throwing hand", kind: "text", operators: TEXT_OPS, hint: "right / left / both" },
  { key: "primary_batting_side", label: "Batting side", kind: "text", operators: TEXT_OPS, hint: "right / left / switch" },
  { key: "is_switch_hitter", label: "Switch hitter", kind: "text", operators: ["eq"], hint: "true / false" },
  { key: "state", label: "State", kind: "text", operators: TEXT_OPS, hint: "two-letter code" },
  { key: "age", label: "Age", kind: "number", operators: NUM_OPS },
  { key: "height_inches", label: "Height (inches)", kind: "number", operators: NUM_OPS },
  { key: "weight", label: "Weight (lbs)", kind: "number", operators: NUM_OPS },
  { key: "graduation_year", label: "Grad year", kind: "number", operators: [...NUM_OPS, "in"] },
  { key: "gpa", label: "GPA", kind: "number", operators: NUM_OPS },
];

/**
 * Official grade/metric columns. Every gradeable tool on the scouting report
 * is matchable — including the mental and eye-test tools added alongside the
 * report redesign.
 */
export const GRADE_FIELDS: readonly StandardField[] = [
  // Applies to every athlete, whatever the role.
  { key: "overall_grade", label: "Overall grade", kind: "grade", operators: NUM_OPS },
  { key: "body_type_frame_grade", label: "Body type / frame", kind: "grade", operators: NUM_OPS },
  { key: "mental_makeup_grade", label: "Mental makeup", kind: "grade", operators: NUM_OPS },
  { key: "poise_competitiveness_grade", label: "Poise / competitiveness", kind: "grade", operators: NUM_OPS },
  { key: "leadership_grade", label: "Leadership", kind: "grade", operators: NUM_OPS },
  { key: "self_efficacy_grade", label: "Self-efficacy", kind: "grade", operators: NUM_OPS },
  { key: "game_iq_grade", label: "Game IQ", kind: "grade", operators: NUM_OPS },
  { key: "hustle_grade", label: "Hustle", kind: "grade", operators: NUM_OPS },
  { key: "eye_test_grade", label: "Eye test", kind: "grade", operators: NUM_OPS },

  // Position-player tools.
  { key: "hitting_grade", label: "Hitting", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },
  { key: "power_grade", label: "Power", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },
  { key: "plate_discipline_grade", label: "Plate discipline", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },
  { key: "speed_grade", label: "Speed", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },
  { key: "defense_grade", label: "Defense", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },
  { key: "throwing_grade", label: "Arm", kind: "grade", operators: NUM_OPS, roles: ["position_player"] },

  // Pitching tools.
  { key: "fastball_grade", label: "Fastball", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "breaking_ball_grade", label: "Breaking ball", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "offspeed_grade", label: "Offspeed", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "rise_ball_grade", label: "Rise ball", kind: "grade", operators: NUM_OPS, roles: ["pitcher"], sports: ["softball"] },
  { key: "control_grade", label: "Control", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "pitchability_grade", label: "Pitchability", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "delivery_grade", label: "Delivery", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "delivery_arm_action_grade", label: "Delivery / arm action", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "deception_grade", label: "Deception", kind: "grade", operators: NUM_OPS, roles: ["pitcher"] },
  { key: "defense_as_pitcher_grade", label: "Defense as pitcher", kind: "grade", operators: NUM_OPS, roles: ["pitcher"], sports: ["baseball"] },
  { key: "hold_runners_grade", label: "Hold runners", kind: "grade", operators: NUM_OPS, roles: ["pitcher"], sports: ["baseball"] },
];

export const ALL_FIELDS: readonly StandardField[] = [...PROFILE_FIELDS, ...GRADE_FIELDS];

export const GRADE_COLUMNS: readonly string[] = GRADE_FIELDS.map((f) => f.key);

/** Roles a `recruiting_role` expands into for field filtering. */
function rolesFor(role: RecruitingRole): readonly FieldRole[] {
  return role === "two_way" ? ["position_player", "pitcher"] : [role];
}

export function fieldAvailable(
  field: StandardField,
  role: RecruitingRole,
  sport: string,
): boolean {
  if (field.sports && !field.sports.includes(sport as StandardSport)) return false;
  if (!field.roles) return true;
  const active = rolesFor(role);
  return field.roles.some((r) => active.includes(r));
}

/** Grade fields offered for a given standard, in role order. */
export function gradeFieldsFor(role: RecruitingRole, sport: string): readonly StandardField[] {
  return GRADE_FIELDS.filter((f) => fieldAvailable(f, role, sport));
}

export function profileFieldsFor(_role: RecruitingRole, _sport: string): readonly StandardField[] {
  return PROFILE_FIELDS;
}

/** Positions a standard may target, per sport. */
export const POSITION_OPTIONS: Record<StandardSport, readonly string[]> = {
  baseball: ["RHP", "LHP", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH", "UTIL"],
  softball: ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DP", "UTIL"],
};

export function positionOptionsFor(sport: string): readonly string[] {
  return POSITION_OPTIONS[(sport as StandardSport)] ?? POSITION_OPTIONS.baseball;
}

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

/**
 * Plain-language running summary of a whole standard, e.g.
 * "Position = RHP, Height ≥ 74in, Fastball ≥ 60".
 * Mandatory criteria all have to pass, so the parts read as an AND list.
 */
export function summarizeCriteria(
  criteria: ReadonlyArray<{ field: string; operator: StandardOperator; value: unknown }>,
): string {
  if (!criteria.length) return "";
  return criteria.map((c) => summarizeCriterion(c.field, c.operator, c.value)).join(", ");
}

const SUMMARY_SYMBOLS: Record<StandardOperator, string> = {
  eq: "=",
  gte: "≥",
  lte: "≤",
  in: "∈",
};

/** Compact form of one criterion for the running summary. */
export function summarizeCriterion(
  field: string,
  operator: StandardOperator,
  value: unknown,
): string {
  const rendered = Array.isArray(value) ? value.join(" / ") : String(value);
  const suffix = field === "height_inches" ? "in" : "";
  return `${fieldLabel(field).replace(" (inches)", "").replace(" (lbs)", "")} ${SUMMARY_SYMBOLS[operator]} ${rendered}${suffix}`;
}

/** The position a standard targets — its own list first, criteria as fallback. */
export function standardPositionLabel(
  criteria: ReadonlyArray<{ field: string; value: unknown }>,
  targetPositions?: readonly string[] | null,
): string {
  if (targetPositions && targetPositions.length > 0) return targetPositions.join(" / ");
  const row = criteria.find((c) => c.field === "position");
  if (!row) return "Any position";
  const v = row.value;
  return Array.isArray(v) ? v.join(" / ") : String(v);
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
  is_switch_hitter?: boolean | null;
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

/** A row from `vault_scout_grade_positions`. */
export interface PositionGradeRow {
  grade_id: string;
  position: string | null;
  defense_grade?: number | null;
  throwing_grade?: number | null;
}

/** A row from `vault_scout_grade_bat_sides`. */
export interface BatSideGradeRow {
  grade_id: string;
  bat_side: string | null;
  hitting_grade?: number | null;
  power_grade?: number | null;
  plate_discipline_grade?: number | null;
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

/** Collapse child rows (position or bat side) into the matcher's scoped shape. */
export function scopedRowsToGrades(
  rows: ReadonlyArray<Record<string, unknown>>,
  scopeKey: string,
  metrics: readonly string[],
  sourceByGradeId: ReadonlyMap<string, string>,
): ScopedGrades[] {
  const byScope = new Map<string, AthleteGrade[]>();
  for (const row of rows) {
    const scope = String(row[scopeKey] ?? "").trim().toLowerCase();
    if (!scope) continue;
    const source = sourceByGradeId.get(String(row.grade_id ?? "")) ?? "";
    const list = byScope.get(scope) ?? [];
    for (const metric of metrics) {
      const v = row[metric];
      if (v === null || v === undefined) continue;
      list.push({ metric, value: v as number, grade_source: source });
    }
    byScope.set(scope, list);
  }
  return [...byScope.entries()].map(([scope, grades]) => ({ scope, grades }));
}

export function buildMatchInput(
  profile: ProfileRow,
  grades: readonly AthleteGrade[],
  scoped?: {
    positionGrades?: readonly ScopedGrades[];
    batSideGrades?: readonly ScopedGrades[];
    positionsPlayed?: readonly string[];
  },
): AthleteMatchInput {
  return {
    athlete_user_id: profile.id,
    profile: {
      position: profile.position ?? null,
      primary_throwing_hand: profile.primary_throwing_hand ?? null,
      primary_batting_side: profile.primary_batting_side ?? null,
      is_switch_hitter: profile.is_switch_hitter ?? null,
      state: profile.state ?? null,
      age: ageFromDob(profile.date_of_birth),
      height_inches: profile.height_inches ?? null,
      weight: profile.weight ?? null,
      graduation_year: profile.graduation_year ?? null,
      gpa: profile.gpa ?? null,
    },
    grades,
    positionGrades: scoped?.positionGrades,
    batSideGrades: scoped?.batSideGrades,
    positionsPlayed: scoped?.positionsPlayed,
  };
}

/** Parse the value a user typed into the shape the matcher expects. */
export function parseCriterionValue(
  raw: string,
  kind: FieldKind,
  operator: StandardOperator,
): number | string | boolean | Array<number | string> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (operator === "in") {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    return kind === "text" ? parts : parts.map(Number).filter((n) => Number.isFinite(n));
  }
  if (kind === "text") {
    const lowered = trimmed.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
    return trimmed;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}
