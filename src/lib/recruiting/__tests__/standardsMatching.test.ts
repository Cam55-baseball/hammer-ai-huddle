import { describe, expect, it } from "vitest";

import {
  evaluateStandardMatch,
  matchAthletesToStandard,
  type AthleteMatchInput,
  type StandardCriterion,
} from "../standardsMatching";

const c = (
  id: string,
  field: string,
  operator: StandardCriterion["operator"],
  value: StandardCriterion["value"],
  isMandatory = true,
): StandardCriterion => ({ id, field, operator, value, is_mandatory: isMandatory });

const athlete = (
  profile: AthleteMatchInput["profile"],
  grades: AthleteMatchInput["grades"] = [],
): AthleteMatchInput => ({ athlete_user_id: "athlete-1", profile, grades });

describe("standards matching — AND semantics", () => {
  const criteria = [
    c("1", "position", "eq", "RHP"),
    c("2", "state", "in", ["TX", "OK"]),
    c("3", "height_inches", "gte", 72),
  ];

  it("matches when every criterion passes", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({ position: "RHP", state: "TX", height_inches: 74 }),
    );
    expect(r.matched).toBe(true);
    expect(r.passed).toHaveLength(3);
    expect(r.failed).toHaveLength(0);
  });

  it("fails the whole standard when a single criterion fails", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({ position: "RHP", state: "TX", height_inches: 70 }),
    );
    expect(r.matched).toBe(false);
    expect(r.failed.map((f) => f.field)).toEqual(["height_inches"]);
    expect(r.failed[0].reason).toBe("comparison_failed");
    expect(r.passed.map((p) => p.field)).toEqual(["position", "state"]);
  });

  it("never matches an empty criteria list", () => {
    expect(evaluateStandardMatch([], athlete({ position: "RHP" })).matched).toBe(false);
  });
});

describe("missing data is always a fail", () => {
  it("fails when the athlete has no value for the field", () => {
    const r = evaluateStandardMatch([c("1", "throw_velocity", "gte", 88)], athlete({}));
    expect(r.matched).toBe(false);
    expect(r.failed[0]).toMatchObject({
      reason: "missing_data",
      actual: null,
      source: null,
    });
  });

  it("treats null, undefined and empty string as missing, not as a value", () => {
    for (const value of [null, undefined, ""]) {
      const r = evaluateStandardMatch(
        [c("1", "state", "eq", "TX")],
        athlete({ state: value as never }),
      );
      expect(r.matched).toBe(false);
      expect(r.failed[0].reason).toBe("missing_data");
    }
  });

  it("does not let a lte criterion pass on missing data", () => {
    // A naive Number(null) === 0 implementation would wrongly pass this.
    const r = evaluateStandardMatch([c("1", "sixty_time", "lte", 7.0)], athlete({}));
    expect(r.matched).toBe(false);
    expect(r.failed[0].reason).toBe("missing_data");
  });

  it("fails an `in` criterion on missing data rather than checking the list", () => {
    const r = evaluateStandardMatch([c("1", "state", "in", ["TX"])], athlete({}));
    expect(r.failed[0].reason).toBe("missing_data");
  });
});

describe("only official grades count", () => {
  const criteria = [c("1", "throw_velocity", "gte", 85)];

  it("uses cv_measured grades", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({}, [{ metric: "throw_velocity", value: 90, grade_source: "cv_measured" }]),
    );
    expect(r.matched).toBe(true);
    expect(r.passed[0].source).toBe("cv_measured");
  });

  it("uses coach_evaluated grades", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({}, [
        { metric: "throw_velocity", value: 86, grade_source: "coach_evaluated" },
      ]),
    );
    expect(r.matched).toBe(true);
    expect(r.passed[0].source).toBe("coach_evaluated");
  });

  it("ignores self-reported grades entirely — they read as missing", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({}, [
        { metric: "throw_velocity", value: 99, grade_source: "self_reported" },
      ]),
    );
    expect(r.matched).toBe(false);
    expect(r.failed[0]).toMatchObject({ reason: "missing_data", actual: null });
  });

  it("does not let a self-reported grade override or supplement an official one", () => {
    const r = evaluateStandardMatch(
      [c("1", "throw_velocity", "gte", 95)],
      athlete({}, [
        { metric: "throw_velocity", value: 88, grade_source: "cv_measured" },
        { metric: "throw_velocity", value: 99, grade_source: "self_reported" },
      ]),
    );
    expect(r.matched).toBe(false);
    expect(r.failed[0].actual).toBe(88);
    expect(r.failed[0].source).toBe("cv_measured");
  });

  it("ignores official grades with a null value", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({}, [{ metric: "throw_velocity", value: null, grade_source: "cv_measured" }]),
    );
    expect(r.failed[0].reason).toBe("missing_data");
  });
});

describe("operators", () => {
  it("eq is case- and whitespace-insensitive for strings", () => {
    const r = evaluateStandardMatch(
      [c("1", "handedness", "eq", "Right")],
      athlete({ handedness: " right " }),
    );
    expect(r.matched).toBe(true);
  });

  it("gte and lte are inclusive at the boundary", () => {
    expect(
      evaluateStandardMatch([c("1", "age", "gte", 16)], athlete({ age: 16 })).matched,
    ).toBe(true);
    expect(
      evaluateStandardMatch([c("1", "age", "lte", 16)], athlete({ age: 16 })).matched,
    ).toBe(true);
  });

  it("treats a non-numeric value under gte as a type mismatch, not a pass", () => {
    const r = evaluateStandardMatch(
      [c("1", "position", "gte", 80)],
      athlete({ position: "RHP" }),
    );
    expect(r.matched).toBe(false);
    expect(r.failed[0].reason).toBe("type_mismatch");
  });

  it("rejects a list value on a scalar operator as an invalid criterion", () => {
    const r = evaluateStandardMatch(
      [c("1", "state", "eq", ["TX", "OK"])],
      athlete({ state: "TX" }),
    );
    expect(r.failed[0].reason).toBe("invalid_criterion");
  });

  it("rejects a scalar value on the `in` operator", () => {
    const r = evaluateStandardMatch(
      [c("1", "state", "in", "TX")],
      athlete({ state: "TX" }),
    );
    expect(r.failed[0].reason).toBe("invalid_criterion");
  });

  it("matches numeric list membership", () => {
    expect(
      evaluateStandardMatch(
        [c("1", "grad_year", "in", [2027, 2028])],
        athlete({ grad_year: 2027 }),
      ).matched,
    ).toBe(true);
  });
});

describe("roster matching", () => {
  it("returns only matching athletes", () => {
    const criteria = [c("1", "position", "eq", "RHP"), c("2", "grad_year", "eq", 2027)];
    const matches = matchAthletesToStandard(criteria, [
      { athlete_user_id: "a", profile: { position: "RHP", grad_year: 2027 }, grades: [] },
      { athlete_user_id: "b", profile: { position: "C", grad_year: 2027 }, grades: [] },
      { athlete_user_id: "c", profile: { position: "RHP" }, grades: [] },
    ]);
    expect(matches.map((m) => m.athlete_user_id)).toEqual(["a"]);
  });
});

describe("mandatory vs preferred criteria", () => {
  const criteria = [
    c("1", "position", "eq", "SS"),
    c("2", "height_inches", "gte", 72, false),
    c("3", "gpa", "gte", 3.5, false),
  ];

  it("matches on mandatory alone and reports preferred coverage", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({ position: "SS", height_inches: 70, gpa: 3.8 }),
    );
    expect(r.matched).toBe(true);
    expect(r.preferred_total).toBe(2);
    expect(r.preferred_met).toBe(1);
  });

  it("still fails when a mandatory criterion fails, however many preferred pass", () => {
    const r = evaluateStandardMatch(
      criteria,
      athlete({ position: "2B", height_inches: 75, gpa: 4.0 }),
    );
    expect(r.matched).toBe(false);
    expect(r.preferred_met).toBe(2);
  });
});
