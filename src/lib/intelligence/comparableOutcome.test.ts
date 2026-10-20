import { describe, it, expect } from "vitest";
import {
  judgeComparableOutcome,
  judgedOutcomeFromRecheck,
  normalVariationBand,
  COMPARABLE_OUTCOME_LABEL,
  RECHECK_MIN_DAYS,
  RECHECK_MAX_DAYS,
} from "./comparableOutcome";

describe("comparable outcome (owner rule: same athlete/sport/category/measure, 2–4 weeks, ≥2 observations)", () => {
  it("uses the measure's existing minimal-change value when one exists", () => {
    // band = 2 (existing minimal-change); +1.5 is inside the band
    expect(judgeComparableOutcome({ before: 60, after: 61.5, minimalChange: 2, daysAfter: 21, observations: 2 })).toBe("no_change");
    // +3 beats the band
    expect(judgeComparableOutcome({ before: 60, after: 63, minimalChange: 2, daysAfter: 21, observations: 2 })).toBe("worked");
    // −3 beyond the band the wrong way
    expect(judgeComparableOutcome({ before: 60, after: 57, minimalChange: 2, daysAfter: 21, observations: 2 })).toBe("got_worse");
  });

  it("falls back to a 3% relative band when no minimal-change value exists", () => {
    expect(normalVariationBand(100, null)).toBeCloseTo(3);
    // +2% is inside the 3% band
    expect(judgeComparableOutcome({ before: 100, after: 102, daysAfter: 14, observations: 2 })).toBe("no_change");
    // +4% beats it
    expect(judgeComparableOutcome({ before: 100, after: 104, daysAfter: 28, observations: 2 })).toBe("worked");
  });

  it("honors lower-is-better measures (e.g. time to first base)", () => {
    expect(judgeComparableOutcome({ before: 4.0, after: 3.8, lowerIsBetter: true, daysAfter: 21, observations: 2 })).toBe("worked");
    expect(judgeComparableOutcome({ before: 4.0, after: 4.2, lowerIsBetter: true, daysAfter: 21, observations: 2 })).toBe("got_worse");
  });

  it("never guesses: missing values are Need more data", () => {
    expect(judgeComparableOutcome({ before: null, after: 60, daysAfter: 21, observations: 2 })).toBe("need_more_data");
    expect(judgeComparableOutcome({ before: 60, after: null, daysAfter: 21, observations: 2 })).toBe("need_more_data");
    expect(judgeComparableOutcome({ before: Number.NaN, after: 60, daysAfter: 21, observations: 2 })).toBe("need_more_data");
  });

  it("re-measures outside the 2–4 week window are not comparable", () => {
    expect(judgeComparableOutcome({ before: 60, after: 70, daysAfter: RECHECK_MIN_DAYS - 1, observations: 2 })).toBe("need_more_data");
    expect(judgeComparableOutcome({ before: 60, after: 70, daysAfter: RECHECK_MAX_DAYS + 1, observations: 2 })).toBe("need_more_data");
    expect(judgeComparableOutcome({ before: 60, after: 70, daysAfter: RECHECK_MIN_DAYS, observations: 2 })).toBe("worked");
  });

  it("fewer than 2 comparable observations is Need more data", () => {
    expect(judgeComparableOutcome({ before: 60, after: 70, daysAfter: 21, observations: 1 })).toBe("need_more_data");
    expect(judgeComparableOutcome({ before: 60, after: 70, daysAfter: 21, observations: 0 })).toBe("need_more_data");
  });

  it("labels match the owner's exact wording", () => {
    expect(COMPARABLE_OUTCOME_LABEL.worked).toBe("It worked");
    expect(COMPARABLE_OUTCOME_LABEL.no_change).toBe("No change");
    expect(COMPARABLE_OUTCOME_LABEL.got_worse).toBe("Got worse");
    expect(COMPARABLE_OUTCOME_LABEL.need_more_data).toBe("Need more data");
  });
});

describe("judgedOutcomeFromRecheck (client re-judgment of a stored server row)", () => {
  const day = 86_400_000;
  const t0 = Date.parse("2026-09-01T12:00:00Z");
  const iso = (ms: number) => new Date(ms).toISOString();

  it("re-judges with the owner rules, not the server's fixed band", () => {
    // Server band (3 units) would call +2.5 "No change"; 3% of 60 = 1.8, so it worked.
    expect(judgedOutcomeFromRecheck({
      baseline_value: 60, recheck_value: 62.5,
      followed_at: iso(t0), checked_at: iso(t0 + 21 * day),
    })).toBe("worked");
  });

  it("a re-check inside 2 weeks is Need more data even when the server stored an outcome", () => {
    expect(judgedOutcomeFromRecheck({
      baseline_value: 60, recheck_value: 70,
      followed_at: iso(t0), checked_at: iso(t0 + 5 * day),
    })).toBe("need_more_data");
  });

  it("a re-check past 4 weeks is Need more data", () => {
    expect(judgedOutcomeFromRecheck({
      baseline_value: 60, recheck_value: 70,
      followed_at: iso(t0), checked_at: iso(t0 + 40 * day),
    })).toBe("need_more_data");
  });

  it("missing or unparseable dates never guess — the window must be verifiable", () => {
    expect(judgedOutcomeFromRecheck({ baseline_value: 60, recheck_value: 70 })).toBe("need_more_data");
    expect(judgedOutcomeFromRecheck({
      baseline_value: 60, recheck_value: 70,
      followed_at: "not-a-date", checked_at: iso(t0),
    })).toBe("need_more_data");
    expect(judgedOutcomeFromRecheck({ baseline_value: null, recheck_value: 70 })).toBe("need_more_data");
  });
});
