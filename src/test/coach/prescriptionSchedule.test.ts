/**
 * Coach prescription scheduling — pure date math (owner request Oct 24, run 6).
 * Pins the four send shapes: any day, specific date(s), weekly recurring
 * (chosen weekdays, every X weeks), and monthly (nth weekday), each bounded
 * by an end date or a number of times, never past the 60-occurrence cap.
 */
import { describe, expect, it } from "vitest";
import { computeScheduleDates, monthlyOccurrence, scheduleSummary, MAX_OCCURRENCES } from "@/lib/coachRx/schedule";

const TODAY = "2026-10-24"; // Saturday

describe("computeScheduleDates", () => {
  it("any_day returns no fixed dates — the player picks when", () => {
    expect(computeScheduleDates({ type: "any_day", startDate: TODAY }, TODAY)).toEqual([]);
  });

  it("a single specific date", () => {
    expect(computeScheduleDates({ type: "date", startDate: "2026-10-27" }, TODAY)).toEqual(["2026-10-27"]);
  });

  it("specific dates include the anchor, drop past days, sort and dedupe", () => {
    expect(
      computeScheduleDates(
        { type: "dates", startDate: "2026-10-28", dates: ["2026-10-26", "2026-10-20", "2026-10-28", "bad"] },
        TODAY,
      ),
    ).toEqual(["2026-10-26", "2026-10-28"]);
  });

  it("Mon/Wed/Fri for 4 weeks starts on the first matching weekday on/after the anchor", () => {
    // Anchor Sat Oct 24 2026; weeks anchored to Sunday Oct 25.
    const days = computeScheduleDates(
      { type: "recurring", startDate: TODAY, weekdays: [1, 3, 5], count: 12 },
      TODAY,
    );
    expect(days).toEqual([
      "2026-10-26", "2026-10-28", "2026-10-30",
      "2026-11-02", "2026-11-04", "2026-11-06",
      "2026-11-09", "2026-11-11", "2026-11-13",
      "2026-11-16", "2026-11-18", "2026-11-20",
    ]);
  });

  it("every 2 weeks skips the in-between week", () => {
    const days = computeScheduleDates(
      { type: "recurring", startDate: "2026-10-26", weekdays: [1], everyWeeks: 2, count: 3 },
      TODAY,
    );
    expect(days).toEqual(["2026-10-26", "2026-11-09", "2026-11-23"]);
  });

  it("weekly recurrence respects an end date", () => {
    const days = computeScheduleDates(
      { type: "recurring", startDate: "2026-10-26", weekdays: [1, 3], endDate: "2026-11-04" },
      TODAY,
    );
    expect(days).toEqual(["2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04"]);
  });

  it("monthly: the first Tuesday, 3 times", () => {
    // First Tuesdays: Nov 3 2026, Dec 1 2026, Jan 5 2027 (Oct's first Tuesday was the 6th, before anchor).
    const days = computeScheduleDates(
      { type: "recurring", startDate: TODAY, monthlyOrdinal: 1, monthlyWeekday: 2, count: 3 },
      TODAY,
    );
    expect(days).toEqual(["2026-11-03", "2026-12-01", "2027-01-05"]);
  });

  it("monthly: last Friday of the month", () => {
    const days = computeScheduleDates(
      { type: "recurring", startDate: TODAY, monthlyOrdinal: 5, monthlyWeekday: 5, count: 2 },
      TODAY,
    );
    expect(days).toEqual(["2026-10-30", "2026-11-27"]);
  });

  it("never exceeds the occurrence cap", () => {
    const days = computeScheduleDates(
      { type: "recurring", startDate: TODAY, weekdays: [0, 1, 2, 3, 4, 5, 6], count: 500 },
      TODAY,
    );
    expect(days.length).toBe(MAX_OCCURRENCES);
  });

  it("invalid input yields no dates", () => {
    expect(computeScheduleDates({ type: "date", startDate: "10/24/2026" }, TODAY)).toEqual([]);
    expect(computeScheduleDates({ type: "recurring", startDate: TODAY, weekdays: [] }, TODAY)).toEqual([]);
  });
});

describe("monthlyOccurrence", () => {
  it("finds the nth weekday and clamps to the month", () => {
    // February 2026 has no 4th Monday... it does: 2,9,16,23. Use 5th Monday → last = Feb 23.
    const last = monthlyOccurrence(new Date("2026-02-01T12:00:00Z"), 1, 5);
    expect(last.toISOString().slice(0, 10)).toBe("2026-02-23");
  });
});

describe("scheduleSummary", () => {
  it("summarizes each shape in plain words", () => {
    expect(scheduleSummary({ type: "any_day", startDate: TODAY })).toContain("player picks when");
    expect(scheduleSummary({ type: "date", startDate: "2026-10-27" })).toContain("2026-10-27");
    expect(scheduleSummary({ type: "recurring", startDate: TODAY, weekdays: [1, 3, 5], count: 12 })).toBe("Mon/Wed/Fri · 12 times");
    expect(scheduleSummary({ type: "recurring", startDate: TODAY, monthlyOrdinal: 1, monthlyWeekday: 2, count: 6 })).toBe("First Tue monthly · 6 times");
    expect(scheduleSummary({ type: "recurring", startDate: TODAY, weekdays: [2], everyWeeks: 3 })).toBe("Tue · every 3 weeks");
  });
});
