import { describe, it, expect } from "vitest";
import { clampDayTypeForRecovery } from "../recoveryClamp";
import type { RecentPitchingLoad } from "../recentLoad";

const emptyLoad: RecentPitchingLoad = { byDate: {}, weeklyTotal: 0, lastOuting: null };

describe("clampDayTypeForRecovery", () => {
  it("does not clamp when no recent load", () => {
    const r = clampDayTypeForRecovery({
      sport: "baseball",
      level: "high_school",
      todayIso: "2026-05-10",
      plannedDayType: "bullpen",
      plannedPitches: 50,
      weeklyCap: 200,
      recent: emptyLoad,
    });
    expect(r.clamped).toBe(false);
    expect(r.dayType).toBe("bullpen");
  });

  it("clamps HS bullpen to flush after 78-pitch outing yesterday (3 days rest)", () => {
    const load: RecentPitchingLoad = {
      byDate: { "2026-05-09": 78 },
      weeklyTotal: 78,
      lastOuting: { isoDate: "2026-05-09", pitches: 78, template: "pitching_outing" },
    };
    const r = clampDayTypeForRecovery({
      sport: "baseball",
      level: "high_school",
      todayIso: "2026-05-10",
      plannedDayType: "bullpen",
      plannedPitches: 50,
      weeklyCap: 200,
      recent: load,
    });
    expect(r.clamped).toBe(true);
    expect(r.dayType).toBe("flush");
    expect(r.restDaysRemaining).toBe(3);
  });

  it("releases the clamp once rest days are served", () => {
    const load: RecentPitchingLoad = {
      byDate: { "2026-05-05": 78 },
      weeklyTotal: 78,
      lastOuting: { isoDate: "2026-05-05", pitches: 78, template: "pitching_outing" },
    };
    const r = clampDayTypeForRecovery({
      sport: "baseball",
      level: "high_school",
      todayIso: "2026-05-10",
      plannedDayType: "bullpen",
      plannedPitches: 50,
      weeklyCap: 200,
      recent: load,
    });
    expect(r.clamped).toBe(false);
    expect(r.dayType).toBe("bullpen");
  });

  it("blocks new mound work when weekly cap is met", () => {
    const load: RecentPitchingLoad = {
      byDate: {},
      weeklyTotal: 210,
      lastOuting: { isoDate: "2026-05-01", pitches: 40, template: "bullpen_pitching" },
    };
    const r = clampDayTypeForRecovery({
      sport: "baseball",
      level: "high_school",
      todayIso: "2026-05-10",
      plannedDayType: "bullpen",
      plannedPitches: 30,
      weeklyCap: 200,
      recent: load,
    });
    expect(r.clamped).toBe(true);
    expect(r.dayType).toBe("flush");
  });

  it("never clamps game day", () => {
    const load: RecentPitchingLoad = {
      byDate: { "2026-05-09": 90 },
      weeklyTotal: 90,
      lastOuting: { isoDate: "2026-05-09", pitches: 90, template: "pitching_outing" },
    };
    const r = clampDayTypeForRecovery({
      sport: "baseball",
      level: "high_school",
      todayIso: "2026-05-10",
      plannedDayType: "game",
      plannedPitches: 100,
      weeklyCap: 200,
      recent: load,
    });
    expect(r.clamped).toBe(false);
    expect(r.dayType).toBe("game");
  });
});
