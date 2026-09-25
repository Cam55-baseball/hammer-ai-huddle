import { describe, it, expect } from "vitest";
import { youthPitchingToday, type YouthPitchingInput } from "../youthPitchingToday";
import { PITCH_SMART_BANDS, bandIndex, restDaysFor } from "../../../../supabase/functions/_shared/wic/phases/youthThrowing";

const base: YouthPitchingInput = {
  sport: "baseball", age: 13, level: "youth", today: "2026-09-25", days: [], heights: [],
  seasonStart: null, checkInFatigue: null, pitcherCatcher: false,
};

describe("youth pitching rules on the card", () => {
  it("clean 13-year-old: 13–14 band, 95 a day, no stop", () => {
    const v = youthPitchingToday(base);
    expect(v.bandLabel).toBe("13–14");
    expect(v.dailyMax).toBe(95);
    expect(v.stopToday).toBe(false);
  });
  it("weekly cap reached blocks pitching", () => {
    const v = youthPitchingToday({ ...base, days: [{ date: "2026-09-22", pitches: 70, innings: 3 }, { date: "2026-09-24", pitches: 55, innings: 3 }] });
    expect(v.stopToday).toBe(true);
    expect(v.lines[0]).toMatch(/weekly pitch cap reached/);
  });
  it("season cap reached blocks pitching", () => {
    const days = Array.from({ length: 11 }, (_, k) => ({ date: `2026-0${6 + Math.floor(k / 4)}-${String(1 + (k % 4) * 7).padStart(2, "0")}`, pitches: 95, innings: 0 }));
    const v = youthPitchingToday({ ...base, days });
    expect(v.lines.join(" ")).toMatch(/season pitch cap/);
  });
  it("yearly innings cap blocks pitching", () => {
    const v = youthPitchingToday({ ...base, age: 16, days: [{ date: "2026-05-01", pitches: 0, innings: 100 }] });
    expect(v.stopToday).toBe(true);
  });
  it("growth of an inch in a month drops a band for 8 weeks with the athlete line", () => {
    const v = youthPitchingToday({ ...base, heights: [{ date: "2026-08-20", inches: 64 }, { date: "2026-09-15", inches: 65 }] });
    expect(v.bandLabel).toBe("11–12");
    expect(v.dailyMax).toBe(85);
    expect(v.growthLine).toMatch(/grown fast/);
    expect(v.staffGrowthLabel).toMatch(/growth-adjusted pitching age/);
  });
  it("tired-arm check-in stops the outing", () => {
    const v = youthPitchingToday({ ...base, checkInFatigue: 9 });
    expect(v.stopToday).toBe(true);
    expect(v.lines.join(" ")).toMatch(/Stop pitching today/);
  });
  it("pitcher-catcher gets the loud line", () => {
    expect(youthPitchingToday({ ...base, pitcherCatcher: true }).pitcherCatcherLine).toMatch(/heaviest arm workloads/);
  });
  it("softball: none of these numbers apply", () => {
    expect(youthPitchingToday({ ...base, sport: "softball" }).applies).toBe(false);
  });

  it("age 20: 106 pitches needs 5 rest days, 105 needs 4", () => {
    const b = PITCH_SMART_BANDS[bandIndex(20)];
    expect(restDaysFor(b, 106)).toBe(5);
    expect(restDaysFor(b, 105)).toBe(4);
    const v = youthPitchingToday({ ...base, age: 20, level: "college", days: [{ date: "2026-09-25", pitches: 106, innings: 6, gameOutings: 1 }] });
    expect(v.restDaysNeeded).toBe(5);
  });
  it("official bands match MLB Pitch Smart", () => {
    const t = (a: number) => PITCH_SMART_BANDS[bandIndex(a)];
    expect([t(8).dailyMax, t(10).dailyMax, t(12).dailyMax, t(14).dailyMax, t(16).dailyMax, t(18).dailyMax]).toEqual([50, 75, 85, 95, 95, 105]);
    expect(t(8).rest.slice(0, 3)).toEqual([[1, 0], [21, 1], [36, 2]]);
    expect(t(12).rest).toEqual([[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]]);
    expect(t(16).rest).toEqual([[1, 0], [31, 1], [46, 2], [61, 3], [76, 4]]);
    expect(t(18).rest).toEqual([[1, 0], [31, 1], [46, 2], [61, 3], [81, 4]]);
  });
  it("third consecutive game day is blocked even at 10 pitches", () => {
    const v = youthPitchingToday({ ...base, days: [
      { date: "2026-09-23", pitches: 10, innings: 1, gameOutings: 1 },
      { date: "2026-09-24", pitches: 10, innings: 1, gameOutings: 1 },
    ] });
    expect(v.stopToday).toBe(true);
    expect(v.lines).toContain("No pitching in a game today — that would be three days in a row.");
  });
  it("bullpens on the previous two days do not trigger the three-day rule", () => {
    const v = youthPitchingToday({ ...base, days: [
      { date: "2026-09-23", pitches: 10, innings: 0, gameOutings: 0 },
      { date: "2026-09-24", pitches: 10, innings: 0, gameOutings: 0 },
    ] });
    expect(v.stopToday).toBe(false);
  });
  it("second game the same day is flagged and pitches combine", () => {
    const v = youthPitchingToday({ ...base, days: [{ date: "2026-09-25", pitches: 60, innings: 4, gameOutings: 2 }] });
    expect(v.stopToday).toBe(true);
    expect(v.lines.join(" ")).toMatch(/second game/);
    expect(v.pitchesToday).toBe(60);
    expect(v.restDaysNeeded).toBe(3);
  });
  it("25-year-old pro and a 28-year-old see no Pitch Smart line; 22-year-old college does", () => {
    const pro = youthPitchingToday({ ...base, age: 25, level: "professional" });
    const old = youthPitchingToday({ ...base, age: 28, level: "college" });
    const col = youthPitchingToday({ ...base, age: 22, level: "college" });
    for (const v of [pro, old]) {
      expect(v.pitchSmart).toBe(false);
      expect(v.dailyMax).toBeNull();
      expect(v.staffProLine).toMatch(/Club protocols/);
    }
    expect(col.pitchSmart).toBe(true);
    expect(col.dailyMax).toBe(120);
    expect(youthPitchingToday({ ...base, age: 20, level: "free_agent" }).pitchSmart).toBe(false);
  });
  it("pro keeps the fatigue stop", () => {
    expect(youthPitchingToday({ ...base, age: 25, level: "pro", checkInFatigue: 9 }).stopToday).toBe(true);
  });
});
