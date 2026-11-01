import { describe, expect, it } from "vitest";
import { validateWeekStructure, type WeekStructureDay } from "./planSanity";
import { resolveInSeasonPlan } from "../../../../supabase/functions/_shared/wic/schedule/inSeasonPlan";

const week = (lifts: number[], phase = "in_season", rest = 6): WeekStructureDay[] =>
  Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(23 + i).padStart(2, "0")}`,
    phase,
    restDay: i === rest,
    liftLoaded: lifts.includes(i),
    categories: i === rest ? [] : ["hitting", "defense"],
  }));

describe("Owner Nov 1 C1/C3 — weekly structure", () => {
  it("the reported week (4 lift days Mon–Thu) is rejected", () => {
    const r = validateWeekStructure(week([0, 1, 2, 3]));
    expect(r.issues.some((i) => i.startsWith("lift_spacing:2026-11-24"))).toBe(true);
    expect(r.issues).toContain("weekly_lift_max:4/2");
  });
  it("in-season Mon + Thu passes; a third in-season lift fails", () => {
    expect(validateWeekStructure(week([0, 3]), {}, { fullWeek: true }).ok).toBe(true);
    expect(validateWeekStructure(week([0, 3, 6], "in_season", 5)).issues).toContain("weekly_lift_max:3/2");
  });
  it("needs 2 full rest days between lifts in every phase", () => {
    expect(validateWeekStructure(week([0, 2], "os_q1")).issues).toContain("lift_spacing:2026-11-25:1/2");
    expect(validateWeekStructure(week([0, 3], "os_q1")).ok).toBe(true);
  });
  it("exactly one rest day per full week", () => {
    const noRest = week([0, 3]).map((d) => ({ ...d, restDay: false }));
    expect(validateWeekStructure(noRest, {}, { fullWeek: true }).issues).toContain("rest_days:0/1");
  });
  it("weekly floors are enforced", () => {
    expect(validateWeekStructure(week([0, 3]), { bunting: 2 }, { fullWeek: true }).issues).toContain("weekly_minimum:bunting:0/2");
  });
  it("no lift the day before a start, no lift on the rest day, arm breach and season mismatch flagged", () => {
    const d = week([0, 3]);
    d[0].startsNextDay = true;
    d[2].armWithinLimits = false;
    d[4].expectedPhase = "os_q1";
    d[6].liftLoaded = true;
    const r = validateWeekStructure(d);
    expect(r.issues).toEqual(expect.arrayContaining([
      "lift_day_before_start:2026-11-23", "arm_limit:2026-11-25",
      "season_mismatch:2026-11-27:in_season/os_q1", "lift_on_rest_day:2026-11-29",
    ]));
  });
  it("a recovery day without a lift takes no A/B slot", () => {
    const base = { phase: "in_season", planDate: "2026-11-24", isGameDay: false, gameRole: "position" as const, lastLiftSlot: "A" as const };
    expect(resolveInSeasonPlan({ ...base, liftRemoved: true }).slot).toBeNull();
    expect(resolveInSeasonPlan(base).slot).toBe("B");
  });
});
