import { describe, it, expect } from "vitest";
import { youthPitchingToday, type YouthPitchingInput } from "../youthPitchingToday";

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
});
