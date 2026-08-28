/**
 * Recruiting standards matching — pure logic, no I/O.
 *
 * A standard is a list of criteria. An athlete matches only when EVERY
 * criterion passes (AND, never OR).
 *
 * Two hard rules, enforced here and not negotiable by callers:
 *  1. Missing data is a FAIL. A criterion that references a field the athlete
 *     has no value for can never pass — missingness is never a match.
 *  2. Only official data counts. Grades whose `grade_source` is not
 *     `cv_measured` or `coach_evaluated` are dropped before evaluation.
 *     Self-reported grades stay private to the athlete and are never
 *     matchable, consistent with the privacy rule everywhere else.
 */

export type StandardOperator = "eq" | "gte" | "lte" | "in";

export type CriterionValue = number | string | boolean | ReadonlyArray<number | string>;

export interface StandardCriterion {
  readonly id: string;
  readonly field: string;
  readonly operator: StandardOperator;
  readonly value: CriterionValue;
}

/** Grade sources that may be used for recruiting matching. */
export const OFFICIAL_GRADE_SOURCES = ["cv_measured", "coach_evaluated"] as const;
export type OfficialGradeSource = (typeof OFFICIAL_GRADE_SOURCES)[number];

export interface AthleteGrade {
  /** Metric / grade name, e.g. "throw_velocity" or "hit_grade". */
  readonly metric: string;
  readonly value: number | string | null;
  /** Anything other than an official source is excluded from matching. */
  readonly grade_source: string;
}

export interface AthleteProfileFacts {
  /** Profile-level facts: position, handedness, state, age, height_inches, … */
  readonly [field: string]: number | string | boolean | null | undefined;
}

export interface AthleteMatchInput {
  readonly athlete_user_id: string;
  readonly profile: AthleteProfileFacts;
  readonly grades: readonly AthleteGrade[];
}

export type CriterionFailReason =
  | "missing_data" // athlete has no official value for this field
  | "comparison_failed" // value present, comparison said no
  | "type_mismatch" // value present but not comparable with this operator
  | "invalid_criterion"; // criterion itself is malformed

export interface CriterionResult {
  readonly criterion_id: string;
  readonly field: string;
  readonly operator: StandardOperator;
  readonly expected: CriterionValue;
  readonly actual: number | string | boolean | null;
  readonly passed: boolean;
  readonly reason: CriterionFailReason | null;
  /** Where the actual value came from, when there was one. */
  readonly source: "profile" | OfficialGradeSource | null;
}

export interface StandardMatchResult {
  readonly athlete_user_id: string;
  readonly matched: boolean;
  readonly passed: readonly CriterionResult[];
  readonly failed: readonly CriterionResult[];
  readonly results: readonly CriterionResult[];
}

export function isOfficialGrade(grade: AthleteGrade): boolean {
  return (OFFICIAL_GRADE_SOURCES as readonly string[]).includes(grade.grade_source);
}

/** Official grades only, most-recent-wins is the caller's job (last one wins here). */
function officialGradeIndex(
  grades: readonly AthleteGrade[],
): Map<string, { value: number | string; source: OfficialGradeSource }> {
  const index = new Map<string, { value: number | string; source: OfficialGradeSource }>();
  for (const g of grades) {
    if (!isOfficialGrade(g)) continue;
    if (g.value === null || g.value === undefined) continue;
    index.set(g.metric, { value: g.value, source: g.grade_source as OfficialGradeSource });
  }
  return index;
}

function resolveField(
  field: string,
  input: AthleteMatchInput,
  gradeIndex: ReturnType<typeof officialGradeIndex>,
): { value: number | string | boolean; source: "profile" | OfficialGradeSource } | null {
  const profileValue = input.profile[field];
  if (profileValue !== null && profileValue !== undefined && profileValue !== "") {
    return { value: profileValue, source: "profile" };
  }
  const grade = gradeIndex.get(field);
  if (grade) return { value: grade.value, source: grade.source };
  return null;
}

function normalizeScalar(v: number | string | boolean): number | string | boolean {
  return typeof v === "string" ? v.trim().toLowerCase() : v;
}

function scalarEquals(a: number | string | boolean, b: number | string | boolean): boolean {
  return normalizeScalar(a) === normalizeScalar(b);
}

function evaluateCriterion(
  criterion: StandardCriterion,
  input: AthleteMatchInput,
  gradeIndex: ReturnType<typeof officialGradeIndex>,
): CriterionResult {
  const base = {
    criterion_id: criterion.id,
    field: criterion.field,
    operator: criterion.operator,
    expected: criterion.value,
  } as const;

  const resolved = resolveField(criterion.field, input, gradeIndex);
  if (!resolved) {
    return { ...base, actual: null, passed: false, reason: "missing_data", source: null };
  }

  const { value: actual, source } = resolved;

  if (criterion.operator === "in") {
    if (!Array.isArray(criterion.value)) {
      return { ...base, actual, passed: false, reason: "invalid_criterion", source };
    }
    const passed = criterion.value.some((candidate) => scalarEquals(actual, candidate));
    return { ...base, actual, passed, reason: passed ? null : "comparison_failed", source };
  }

  if (Array.isArray(criterion.value)) {
    return { ...base, actual, passed: false, reason: "invalid_criterion", source };
  }

  if (criterion.operator === "eq") {
    const passed = scalarEquals(actual, criterion.value as number | string | boolean);
    return { ...base, actual, passed, reason: passed ? null : "comparison_failed", source };
  }

  // gte / lte are numeric-only. A non-numeric value is a type mismatch, not a pass.
  const actualNum = typeof actual === "number" ? actual : Number(actual);
  const expectedNum =
    typeof criterion.value === "number" ? criterion.value : Number(criterion.value);
  if (
    typeof actual === "boolean" ||
    !Number.isFinite(actualNum) ||
    !Number.isFinite(expectedNum)
  ) {
    return { ...base, actual, passed: false, reason: "type_mismatch", source };
  }

  const passed =
    criterion.operator === "gte" ? actualNum >= expectedNum : actualNum <= expectedNum;
  return { ...base, actual, passed, reason: passed ? null : "comparison_failed", source };
}

/**
 * Evaluate one athlete against one standard's criteria.
 * An empty criteria list never matches — a standard with no requirements is
 * not a standard, and silently matching everyone would be the worst failure
 * mode this function could have.
 */
export function evaluateStandardMatch(
  criteria: readonly StandardCriterion[],
  input: AthleteMatchInput,
): StandardMatchResult {
  const gradeIndex = officialGradeIndex(input.grades);
  const results = criteria.map((c) => evaluateCriterion(c, input, gradeIndex));
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  return {
    athlete_user_id: input.athlete_user_id,
    matched: criteria.length > 0 && failed.length === 0,
    passed,
    failed,
    results,
  };
}

/** Convenience: evaluate a roster, returning only the athletes that match. */
export function matchAthletesToStandard(
  criteria: readonly StandardCriterion[],
  athletes: readonly AthleteMatchInput[],
): readonly StandardMatchResult[] {
  return athletes.map((a) => evaluateStandardMatch(criteria, a)).filter((r) => r.matched);
}
