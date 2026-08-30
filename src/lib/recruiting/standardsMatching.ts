/**
 * Recruiting standards matching — pure logic, no I/O.
 *
 * A standard is a list of criteria. Criteria come in two strengths:
 *  - MANDATORY: every one must pass for the athlete to match (AND, never OR).
 *  - PREFERRED: tracked and reported, but never blocks a match.
 *
 * Three hard rules, enforced here and not negotiable by callers:
 *  1. Missing data is a FAIL. A criterion that references a field the athlete
 *     has no value for can never pass — missingness is never a match.
 *  2. Only official data counts. Grades whose `grade_source` is not
 *     `cv_measured` or `coach_evaluated` are dropped before evaluation.
 *     Self-reported grades stay private to the athlete and are never
 *     matchable, consistent with the privacy rule everywhere else.
 *  3. A standard with no MANDATORY criteria matches nobody. An all-preferred
 *     standard would otherwise silently match every athlete in the system,
 *     which is the worst failure mode this function could have.
 */

export type StandardOperator = "eq" | "gte" | "lte" | "in";

export type CriterionValue = number | string | boolean | ReadonlyArray<number | string>;

export interface StandardCriterion {
  readonly id: string;
  readonly field: string;
  readonly operator: StandardOperator;
  readonly value: CriterionValue;
  /** Mandatory criteria gate the match; preferred ones only add nuance. */
  readonly is_mandatory: boolean;
}

/** Grade sources that may be used for recruiting matching. */
export const OFFICIAL_GRADE_SOURCES = ["cv_measured", "coach_evaluated"] as const;
export type OfficialGradeSource = (typeof OFFICIAL_GRADE_SOURCES)[number];

/**
 * Grades that live per-position on `vault_scout_grade_positions`. The flat
 * column of the same name on `vault_scout_grades` mirrors only the athlete's
 * primary position, so a position-targeted standard must not read it.
 */
export const POSITION_SCOPED_FIELDS = ["defense_grade", "throwing_grade"] as const;

/** Grades that live per-bat-side on `vault_scout_grade_bat_sides`. */
export const BAT_SIDE_SCOPED_FIELDS = [
  "hitting_grade",
  "power_grade",
  "plate_discipline_grade",
] as const;

export function isPositionScopedField(field: string): boolean {
  return (POSITION_SCOPED_FIELDS as readonly string[]).includes(field);
}

export function isBatSideScopedField(field: string): boolean {
  return (BAT_SIDE_SCOPED_FIELDS as readonly string[]).includes(field);
}

export interface AthleteGrade {
  /** Metric / grade name, e.g. "throw_velocity" or "hit_grade". */
  readonly metric: string;
  readonly value: number | string | null;
  /** Anything other than an official source is excluded from matching. */
  readonly grade_source: string;
}

/** One scope (a position, or a bat side) with its own official grades. */
export interface ScopedGrades {
  /** Position code ("C", "SS") or bat side ("right" / "left"), lowercased. */
  readonly scope: string;
  readonly grades: readonly AthleteGrade[];
}

export interface AthleteProfileFacts {
  /** Profile-level facts: position, handedness, state, age, height_inches, … */
  readonly [field: string]: number | string | boolean | null | undefined;
}

export interface AthleteMatchInput {
  readonly athlete_user_id: string;
  readonly profile: AthleteProfileFacts;
  readonly grades: readonly AthleteGrade[];
  /** Per-position defense / arm grades, when the scout filed them. */
  readonly positionGrades?: readonly ScopedGrades[];
  /** Per-bat-side hitting / power / plate-discipline grades. */
  readonly batSideGrades?: readonly ScopedGrades[];
  /** Every position this athlete plays, lowercased. Used for position gating. */
  readonly positionsPlayed?: readonly string[];
}

export type PositionMatchLogic = "any" | "all";

export interface StandardContext {
  /** Positions the standard targets. Empty means "any position". */
  readonly targetPositions: readonly string[];
  /** Whether the athlete must fit every target position or just one. */
  readonly positionMatchLogic: PositionMatchLogic;
}

export const DEFAULT_STANDARD_CONTEXT: StandardContext = {
  targetPositions: [],
  positionMatchLogic: "any",
};

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
  readonly is_mandatory: boolean;
  readonly reason: CriterionFailReason | null;
  /** Where the actual value came from, when there was one. */
  readonly source: "profile" | OfficialGradeSource | null;
  /** Position or bat side the value was read from, for scoped grades. */
  readonly scope: string | null;
}

export interface StandardMatchResult {
  readonly athlete_user_id: string;
  readonly matched: boolean;
  readonly passed: readonly CriterionResult[];
  readonly failed: readonly CriterionResult[];
  readonly results: readonly CriterionResult[];
  /** Preferred-criteria nuance. Never affects `matched`. */
  readonly preferred: readonly CriterionResult[];
  readonly preferred_met: number;
  readonly preferred_total: number;
  /** True when the standard's position gate excluded this athlete outright. */
  readonly position_gate_failed: boolean;
}

export function isOfficialGrade(grade: AthleteGrade): boolean {
  return (OFFICIAL_GRADE_SOURCES as readonly string[]).includes(grade.grade_source);
}

type GradeIndex = Map<string, { value: number | string; source: OfficialGradeSource }>;

/** Official grades only, most-recent-wins is the caller's job (last one wins here). */
function officialGradeIndex(grades: readonly AthleteGrade[]): GradeIndex {
  const index: GradeIndex = new Map();
  for (const g of grades) {
    if (!isOfficialGrade(g)) continue;
    if (g.value === null || g.value === undefined) continue;
    index.set(g.metric, { value: g.value, source: g.grade_source as OfficialGradeSource });
  }
  return index;
}

function scopedIndexes(scoped: readonly ScopedGrades[] | undefined): Map<string, GradeIndex> {
  const out = new Map<string, GradeIndex>();
  for (const entry of scoped ?? []) {
    out.set(entry.scope.trim().toLowerCase(), officialGradeIndex(entry.grades));
  }
  return out;
}

function normalizeScalar(v: number | string | boolean): number | string | boolean {
  return typeof v === "string" ? v.trim().toLowerCase() : v;
}

function scalarEquals(a: number | string | boolean, b: number | string | boolean): boolean {
  return normalizeScalar(a) === normalizeScalar(b);
}

/** Pure comparison. Returns null when the value can't be compared at all. */
function compare(
  operator: StandardOperator,
  actual: number | string | boolean,
  expected: CriterionValue,
): { passed: boolean; reason: CriterionFailReason | null } {
  if (operator === "in") {
    if (!Array.isArray(expected)) return { passed: false, reason: "invalid_criterion" };
    const passed = expected.some((candidate) => scalarEquals(actual, candidate));
    return { passed, reason: passed ? null : "comparison_failed" };
  }

  if (Array.isArray(expected)) return { passed: false, reason: "invalid_criterion" };

  if (operator === "eq") {
    const passed = scalarEquals(actual, expected as number | string | boolean);
    return { passed, reason: passed ? null : "comparison_failed" };
  }

  // gte / lte are numeric-only. A non-numeric value is a type mismatch, not a pass.
  const actualNum = typeof actual === "number" ? actual : Number(actual);
  const expectedNum = typeof expected === "number" ? expected : Number(expected);
  if (typeof actual === "boolean" || !Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) {
    return { passed: false, reason: "type_mismatch" };
  }
  const passed = operator === "gte" ? actualNum >= expectedNum : actualNum <= expectedNum;
  return { passed, reason: passed ? null : "comparison_failed" };
}

interface Resolution {
  value: number | string | boolean;
  source: "profile" | OfficialGradeSource;
  scope: string | null;
}

function resolveFlat(
  field: string,
  input: AthleteMatchInput,
  gradeIndex: GradeIndex,
): Resolution | null {
  const profileValue = input.profile[field];
  if (profileValue !== null && profileValue !== undefined && profileValue !== "") {
    return { value: profileValue, source: "profile", scope: null };
  }
  const grade = gradeIndex.get(field);
  if (grade) return { value: grade.value, source: grade.source, scope: null };
  return null;
}

/**
 * Evaluate a scoped grade (per-position or per-bat-side) across the candidate
 * scopes. `requireAll` forces every candidate scope to have a value AND pass;
 * otherwise a single qualifying scope carries the criterion.
 */
function evaluateScoped(
  criterion: StandardCriterion,
  candidates: readonly string[],
  indexes: Map<string, GradeIndex>,
  requireAll: boolean,
): { passed: boolean; reason: CriterionFailReason | null; resolution: Resolution | null } {
  let firstMiss: CriterionFailReason | null = null;
  let anyResolved: Resolution | null = null;
  let allPassed = candidates.length > 0;
  let winner: Resolution | null = null;

  for (const scope of candidates) {
    const index = indexes.get(scope);
    const grade = index?.get(criterion.field);
    if (!grade) {
      allPassed = false;
      firstMiss ??= "missing_data";
      continue;
    }
    const resolution: Resolution = { value: grade.value, source: grade.source, scope };
    anyResolved ??= resolution;
    const { passed, reason } = compare(criterion.operator, grade.value, criterion.value);
    if (passed) {
      winner ??= resolution;
    } else {
      allPassed = false;
      firstMiss ??= reason;
    }
  }

  if (requireAll) {
    return {
      passed: allPassed,
      reason: allPassed ? null : (firstMiss ?? "comparison_failed"),
      resolution: winner ?? anyResolved,
    };
  }
  if (winner) return { passed: true, reason: null, resolution: winner };
  return {
    passed: false,
    reason: firstMiss ?? "missing_data",
    resolution: anyResolved,
  };
}

function evaluateCriterion(
  criterion: StandardCriterion,
  input: AthleteMatchInput,
  gradeIndex: GradeIndex,
  context: StandardContext,
  positionIndexes: Map<string, GradeIndex>,
  batSideIndexes: Map<string, GradeIndex>,
): CriterionResult {
  const base = {
    criterion_id: criterion.id,
    field: criterion.field,
    operator: criterion.operator,
    expected: criterion.value,
    is_mandatory: criterion.is_mandatory,
  } as const;

  // Position-scoped grades follow the positions the standard targets.
  if (isPositionScopedField(criterion.field) && context.targetPositions.length > 0) {
    const candidates = context.targetPositions.map((p) => p.trim().toLowerCase());
    const hasScopedData = candidates.some((c) => positionIndexes.has(c));
    if (hasScopedData) {
      const { passed, reason, resolution } = evaluateScoped(
        criterion,
        candidates,
        positionIndexes,
        context.positionMatchLogic === "all",
      );
      return {
        ...base,
        actual: resolution?.value ?? null,
        passed,
        reason,
        source: resolution?.source ?? null,
        scope: resolution?.scope ?? null,
      };
    }
    // No per-position rows filed — fall through to the flat mirror below so
    // legacy grades filed before the split still evaluate.
  }

  // Bat-side grades: a switch-hitter qualifies if either side clears the bar.
  // A scout who cares which side adds an explicit batting-side criterion.
  if (isBatSideScopedField(criterion.field) && batSideIndexes.size > 0) {
    const { passed, reason, resolution } = evaluateScoped(
      criterion,
      [...batSideIndexes.keys()],
      batSideIndexes,
      false,
    );
    return {
      ...base,
      actual: resolution?.value ?? null,
      passed,
      reason,
      source: resolution?.source ?? null,
      scope: resolution?.scope ?? null,
    };
  }

  const resolved = resolveFlat(criterion.field, input, gradeIndex);
  if (!resolved) {
    return { ...base, actual: null, passed: false, reason: "missing_data", source: null, scope: null };
  }

  const { passed, reason } = compare(criterion.operator, resolved.value, criterion.value);
  return {
    ...base,
    actual: resolved.value,
    passed,
    reason,
    source: resolved.source,
    scope: null,
  };
}

/**
 * Does the athlete satisfy the standard's position gate?
 * "any" → plays at least one target position. "all" → plays every one.
 * Empty target list means the standard is position-agnostic.
 */
function passesPositionGate(input: AthleteMatchInput, context: StandardContext): boolean {
  if (context.targetPositions.length === 0) return true;
  const targets = context.targetPositions.map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (targets.length === 0) return true;

  const played = new Set(
    (input.positionsPlayed ?? [])
      .concat(typeof input.profile.position === "string" ? [input.profile.position] : [])
      .map((p) => String(p).trim().toLowerCase())
      .filter(Boolean),
  );
  if (played.size === 0) return false; // missing data is a fail

  return context.positionMatchLogic === "all"
    ? targets.every((t) => played.has(t))
    : targets.some((t) => played.has(t));
}

/**
 * Evaluate one athlete against one standard's criteria.
 *
 * `matched` requires (a) the position gate to pass and (b) every MANDATORY
 * criterion to pass. A standard with zero mandatory criteria never matches.
 * Preferred criteria are reported but can never block or force a match.
 */
export function evaluateStandardMatch(
  criteria: readonly StandardCriterion[],
  input: AthleteMatchInput,
  context: StandardContext = DEFAULT_STANDARD_CONTEXT,
): StandardMatchResult {
  const gradeIndex = officialGradeIndex(input.grades);
  const positionIndexes = scopedIndexes(input.positionGrades);
  const batSideIndexes = scopedIndexes(input.batSideGrades);

  const results = criteria.map((c) =>
    evaluateCriterion(c, input, gradeIndex, context, positionIndexes, batSideIndexes),
  );

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const mandatory = results.filter((r) => r.is_mandatory);
  const preferred = results.filter((r) => !r.is_mandatory);
  const positionGateFailed = !passesPositionGate(input, context);

  const matched =
    !positionGateFailed &&
    mandatory.length > 0 &&
    mandatory.every((r) => r.passed);

  return {
    athlete_user_id: input.athlete_user_id,
    matched,
    passed,
    failed,
    results,
    preferred,
    preferred_met: preferred.filter((r) => r.passed).length,
    preferred_total: preferred.length,
    position_gate_failed: positionGateFailed,
  };
}

/** Convenience: evaluate a roster, returning only the athletes that match. */
export function matchAthletesToStandard(
  criteria: readonly StandardCriterion[],
  athletes: readonly AthleteMatchInput[],
  context: StandardContext = DEFAULT_STANDARD_CONTEXT,
): readonly StandardMatchResult[] {
  return athletes.map((a) => evaluateStandardMatch(criteria, a, context)).filter((r) => r.matched);
}
