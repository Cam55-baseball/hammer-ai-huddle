import { describe, expect, it } from "vitest";
import { ageYears, fairnessWarnings, gradeSourceLabel, type ComparedAthlete } from "./compareAthletes";

const TODAY = new Date("2026-10-12T12:00:00Z");

function athlete(over: Partial<ComparedAthlete> = {}): ComparedAthlete {
  return {
    athlete_id: "a1",
    name: "Player One",
    primary_position: "Pitcher",
    league_tier: "high_school",
    date_of_birth: "2010-06-01",
    latest_test: null,
    test_count: 5,
    latest_grade: null,
    week_completion_pct: 80,
    game_summary: null,
    ...over,
  };
}

describe("ageYears", () => {
  it("computes age and handles missing dates", () => {
    expect(ageYears("2010-06-01", TODAY)).toBe(16);
    expect(ageYears("2010-12-01", TODAY)).toBe(15);
    expect(ageYears(null, TODAY)).toBeNull();
    expect(ageYears("not-a-date", TODAY)).toBeNull();
  });
});

describe("fairnessWarnings", () => {
  it("warns about different positions", () => {
    const w = fairnessWarnings([athlete(), athlete({ athlete_id: "a2", primary_position: "Catcher" })], TODAY);
    expect(w.some((x) => x.includes("different positions"))).toBe(true);
  });

  it("warns about different levels", () => {
    const w = fairnessWarnings([athlete(), athlete({ athlete_id: "a2", league_tier: "college" })], TODAY);
    expect(w.some((x) => x.includes("different levels"))).toBe(true);
  });

  it("warns about an age gap of 2+ years", () => {
    const w = fairnessWarnings(
      [athlete(), athlete({ athlete_id: "a2", date_of_birth: "2007-06-01" })],
      TODAY,
    );
    expect(w.some((x) => x.includes("Age gap of 3 years"))).toBe(true);
  });

  it("does not warn about a 1-year age gap", () => {
    const w = fairnessWarnings(
      [athlete(), athlete({ athlete_id: "a2", date_of_birth: "2009-06-01" })],
      TODAY,
    );
    expect(w.some((x) => x.includes("Age gap"))).toBe(false);
  });

  it("warns when a player has fewer than 2 logged tests", () => {
    const w = fairnessWarnings([athlete(), athlete({ athlete_id: "a2", name: "Player Two", test_count: 1 })], TODAY);
    expect(w.some((x) => x.includes("Player Two") && x.includes("not enough data"))).toBe(true);
  });

  it("returns no warnings for two similar well-tested players", () => {
    const w = fairnessWarnings([athlete(), athlete({ athlete_id: "a2", date_of_birth: "2010-03-01" })], TODAY);
    expect(w).toEqual([]);
  });
});

describe("gradeSourceLabel", () => {
  it("labels who entered the grade", () => {
    expect(gradeSourceLabel("self")).toBe("Source: athlete-entered");
    expect(gradeSourceLabel("coach")).toBe("Source: coach-entered");
    expect(gradeSourceLabel("organization")).toBe("Source: organization-entered");
    expect(gradeSourceLabel(null)).toBe("Source: not recorded");
  });
});
