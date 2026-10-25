import { describe, it, expect } from "vitest";
import { checkCoachArmLoad } from "../../../supabase/functions/_shared/coach/armLoadCheck";

const shift = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const DATE = "2026-10-25";
/** Recent daily catch play so no ramp is running. */
const recentEntries = (days: number, count = 30) =>
  Array.from({ length: days }, (_, i) => ({ entry_date: shift(DATE, -(i + 1)), throw_type: "catch_play" as const, count, status: "done" as const }));

const base = {
  sport: "baseball" as const, positions: ["ss"], age: 14, growthMode: false,
  date: DATE, entries: recentEntries(7), gameDates: [] as string[],
};

describe("coach prescription arm-load check", () => {
  it("allows moderate throws inside the daily and weekly budget", () => {
    const r = checkCoachArmLoad({ ...base, planned: [{ count: 30, kind: "practice", intensityClass: "moderate" }] });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("no planned throws means no arm check", () => {
    expect(checkCoachArmLoad({ ...base, planned: [] }).allowed).toBe(true);
  });

  it("blocks a pitch plan over the Pitch Smart daily maximum (95 at age 14)", () => {
    const r = checkCoachArmLoad({ ...base, positions: ["p"], planned: [{ count: 100, kind: "pitch", intensityClass: "high" }] });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/arm limit/);
  });

  it("allows pitches under the daily maximum for a pitcher with recent throwing", () => {
    const r = checkCoachArmLoad({ ...base, positions: ["p"], planned: [{ count: 40, kind: "pitch", intensityClass: "high" }] });
    expect(r.allowed).toBe(true);
  });

  it("blocks when the weekly arm budget would be passed", () => {
    // Age 16 position player: daily 70 units, weekly 280. Six logged days of
    // 60 moderate throws (36 units each = 216) plus 110 planned (66) = 282 > 280,
    // while 66 stays under the daily 70.
    const entries = Array.from({ length: 6 }, (_, i) => ({ entry_date: shift(DATE, -(i + 1)), throw_type: "position_throws" as const, count: 60, status: "done" as const }));
    const r = checkCoachArmLoad({ ...base, age: 16, entries, planned: [{ count: 110, kind: "practice", intensityClass: "moderate" }] });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/week's arm limit/);
  });

  it("blocks hard throwing while a throwing ramp is rebuilding after a 30-day gap", () => {
    // Threw daily until 32 days ago, then returned yesterday: 30 days off.
    const old = Array.from({ length: 5 }, (_, i) => ({ entry_date: shift(DATE, -(33 + i)), throw_type: "position_throws" as const, count: 30, status: "done" as const }));
    const entries = [...old, { entry_date: shift(DATE, -1), throw_type: "catch_play" as const, count: 30, status: "done" as const }];
    const hard = checkCoachArmLoad({ ...base, entries, planned: [{ count: 20, kind: "practice", intensityClass: "high" }] });
    expect(hard.allowed).toBe(false);
    expect(hard.reason).toMatch(/building back/);
    const easy = checkCoachArmLoad({ ...base, entries, planned: [{ count: 20, kind: "practice", intensityClass: "moderate" }] });
    expect(easy.allowed).toBe(true);
  });

  it("blocks pitches during a ramp even when the count is small", () => {
    // 10 days off (doubling band, 20-day pitcher ramp), returned yesterday.
    const old = Array.from({ length: 4 }, (_, i) => ({ entry_date: shift(DATE, -(12 + i)), throw_type: "position_throws" as const, count: 30, status: "done" as const }));
    const entries = [...old, { entry_date: shift(DATE, -1), throw_type: "catch_play" as const, count: 20, status: "done" as const }];
    const r = checkCoachArmLoad({ ...base, positions: ["p"], entries, planned: [{ count: 15, kind: "pitch", intensityClass: "high" }] });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/building back/);
  });

  it("never fabricates a year-long break for a new account with no earlier history", () => {
    // Only 3 recent days on record: no prior throw day before the streak, so no
    // ramp gap is invented; budgets still apply.
    const r = checkCoachArmLoad({ ...base, entries: recentEntries(3), planned: [{ count: 30, kind: "practice", intensityClass: "high" }] });
    expect(r.allowed).toBe(true);
  });

  it("rejects non-integer or zero throw counts instead of guessing", () => {
    expect(checkCoachArmLoad({ ...base, planned: [{ count: 0, kind: "practice", intensityClass: "moderate" }] }).allowed).toBe(false);
    expect(checkCoachArmLoad({ ...base, planned: [{ count: 12.5, kind: "practice", intensityClass: "moderate" }] }).allowed).toBe(false);
  });

  it("skipped and unknown ledger entries never count as arm load", () => {
    const entries = [
      ...recentEntries(7),
      { entry_date: DATE, throw_type: "position_throws" as const, count: 200, status: "skipped" as const },
      { entry_date: DATE, throw_type: "mystery" as any, count: 200, status: "done" as const },
    ];
    expect(checkCoachArmLoad({ ...base, entries, planned: [{ count: 30, kind: "practice", intensityClass: "moderate" }] }).allowed).toBe(true);
  });
});
