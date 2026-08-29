import { describe, it, expect } from "vitest";
import {
  aggregateDefenseGrade,
  type DefensivePlayRep,
} from "@/lib/defense/defenseGradeAggregate";

const NOW = new Date("2026-06-01T00:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("aggregateDefenseGrade", () => {
  it("returns missing when there are no reps", () => {
    expect(aggregateDefenseGrade([], { now: NOW })).toMatchObject({
      grade: null,
      missing: true,
      missing_reason: "no_reps",
      repsTotal: 0,
    });
  });

  it("returns missing when no rep carries a grade", () => {
    const plays: DefensivePlayRep[] = [
      { beaten_runner_grade: null, created_at: daysAgo(1) },
      { beaten_runner_grade: null, created_at: daysAgo(2) },
    ];
    expect(aggregateDefenseGrade(plays, { now: NOW })).toMatchObject({
      grade: null,
      missing: true,
      missing_reason: "no_graded_reps",
      repsTotal: 2,
      repsUsed: 0,
    });
  });

  it("ignores ungraded reps but still counts them in repsTotal", () => {
    const plays: DefensivePlayRep[] = [
      { beaten_runner_grade: 60, created_at: daysAgo(0) },
      { beaten_runner_grade: null, created_at: daysAgo(0) },
    ];
    const r = aggregateDefenseGrade(plays, { now: NOW });
    expect(r).toMatchObject({ grade: 60, repsUsed: 1, repsTotal: 2, missing: false });
  });

  it("straight average when recency weighting is off", () => {
    const plays: DefensivePlayRep[] = [
      { beaten_runner_grade: 40, created_at: daysAgo(300) },
      { beaten_runner_grade: 60, created_at: daysAgo(0) },
    ];
    const r = aggregateDefenseGrade(plays, { now: NOW, recencyWeighted: false });
    expect(r.rawMean).toBe(50);
    expect(r.grade).toBe(50);
  });

  it("weights recent reps more heavily than old ones", () => {
    const plays: DefensivePlayRep[] = [
      { beaten_runner_grade: 40, created_at: daysAgo(180) },
      { beaten_runner_grade: 70, created_at: daysAgo(0) },
    ];
    const weighted = aggregateDefenseGrade(plays, { now: NOW }).rawMean!;
    const straight = aggregateDefenseGrade(plays, {
      now: NOW,
      recencyWeighted: false,
    }).rawMean!;
    expect(weighted).toBeGreaterThan(straight);
  });

  it("halves the weight at exactly one half-life", () => {
    const plays: DefensivePlayRep[] = [
      { beaten_runner_grade: 80, created_at: daysAgo(0) },
      { beaten_runner_grade: 20, created_at: daysAgo(45) },
    ];
    // (80*1 + 20*0.5) / 1.5 = 60
    expect(aggregateDefenseGrade(plays, { now: NOW }).rawMean).toBeCloseTo(60, 6);
  });

  it("rounds to the nearest 5-point scouting grade and clamps to 20-80", () => {
    const r = aggregateDefenseGrade(
      [{ beaten_runner_grade: 57, created_at: daysAgo(0) }],
      { now: NOW },
    );
    expect(r.grade! % 5).toBe(0);
    expect(r.grade).toBe(55);

    const low = aggregateDefenseGrade(
      [{ beaten_runner_grade: 5, created_at: daysAgo(0) }],
      { now: NOW },
    );
    expect(low.grade).toBe(20);
  });

  it("attaches the shared grade label", () => {
    const r = aggregateDefenseGrade(
      [{ beaten_runner_grade: 70, created_at: daysAgo(0) }],
      { now: NOW },
    );
    expect(r.label).toBe("Elite");
  });

  it("treats reps with no timestamp as unweighted rather than dropping them", () => {
    const r = aggregateDefenseGrade(
      [
        { beaten_runner_grade: 50 },
        { beaten_runner_grade: 50, created_at: null },
      ],
      { now: NOW },
    );
    expect(r).toMatchObject({ grade: 50, repsUsed: 2, missing: false });
  });

  it("is monotonic — a better added rep never lowers the grade", () => {
    const base: DefensivePlayRep[] = [
      { beaten_runner_grade: 50, created_at: daysAgo(1) },
    ];
    const better = aggregateDefenseGrade(
      [...base, { beaten_runner_grade: 80, created_at: daysAgo(0) }],
      { now: NOW },
    ).rawMean!;
    const baseMean = aggregateDefenseGrade(base, { now: NOW }).rawMean!;
    expect(better).toBeGreaterThanOrEqual(baseMean);
  });
});
