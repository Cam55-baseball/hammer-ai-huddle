import { describe, expect, it } from "vitest";
import { THROW_TARGETS, weeklyThrowTarget, fullGoConflicts, throwGroup, unitsForRawDay, throwTargetLine, type ThrowGroup } from "../../supabase/functions/_shared/wic/phases/positionThrowTargets";
import { greenlightLevel } from "../../supabase/functions/_shared/wic/progression/greenlight";
import { armBudget, fieldDistances } from "../../supabase/functions/_shared/wic/phases/armLedger";

const groups: ThrowGroup[] = ["middle_infield", "first_base", "outfield", "catcher"];

describe("owner Nov 1 position throw targets", () => {
  it("uses the owner's numbers", () => {
    expect(THROW_TARGETS.middle_infield).toMatchObject({ day: [60, 100], heavyDayMax: 150, week: [400, 600] });
    expect(THROW_TARGETS.first_base).toMatchObject({ day: [40, 70], week: [250, 400] });
    expect(THROW_TARGETS.outfield).toMatchObject({ day: [50, 80], week: [300, 480] });
    expect(THROW_TARGETS.catcher).toMatchObject({ day: [120, 200], week: [700, 1000] });
    expect(throwGroup("SS")).toBe("middle_infield");
    expect(throwGroup("3B")).toBe("middle_infield");
    expect(throwGroup("1B")).toBe("first_base");
    expect(throwGroup("CF")).toBe("outfield");
    expect(throwGroup("C")).toBe("catcher");
    expect(throwGroup("P")).toBeNull();
  });

  it("catcher return throws count light, not like full-effort throws", () => {
    expect(unitsForRawDay("catcher", 200)).toBeLessThan(unitsForRawDay("middle_infield", 200));
  });

  for (const sport of ["baseball", "softball"] as const) for (const g of groups) for (const age of [12, 15, 17, 20]) {
    it(`${sport} ${g} age ${age}: builds ~10%/wk, never >30%, never over cap, holds in-season`, () => {
      const cap = armBudget({ sport, role: g === "catcher" ? "catcher" : "position", age });
      let last = Math.round(THROW_TARGETS[g].week[0] * 0.5);
      for (let w = 0; w < 12; w++) {
        const t = weeklyThrowTarget({ group: g, sport, age, lastWeekRaw: last, inSeason: false });
        expect(t.weekly).toBeLessThanOrEqual(Math.floor(last * 1.3));
        expect(t.weekly).toBeLessThanOrEqual(Math.max(last, Math.round(last * 1.1)));
        expect(t.weekly).toBeLessThanOrEqual(THROW_TARGETS[g].week[1]);
        expect(unitsForRawDay(g, t.daily)).toBeLessThanOrEqual(cap.daily);
        last = t.weekly;
      }
      const hold = weeklyThrowTarget({ group: g, sport, age, lastWeekRaw: last, inSeason: true });
      expect(hold.weekly).toBe(Math.min(last, THROW_TARGETS[g].week[1]));
      expect(hold.holding).toBe(true);
    });
  }

  it("adults on green weeks reach the full-go week range where the caps allow it", () => {
    let last = 200;
    const green = greenlightLevel("throwing", ["green"], 20);
    for (let w = 0; w < 20; w++) last = weeklyThrowTarget({ group: "middle_infield", sport: "baseball", age: 20, lastWeekRaw: last, inSeason: false, greenlight: green }).weekly;
    expect(last).toBeGreaterThanOrEqual(400);
  });

  it("under 19: target is hidden and needs 3 green weeks to step (adults 1)", () => {
    const youth = weeklyThrowTarget({ group: "outfield", sport: "baseball", age: 17, lastWeekRaw: 300, inSeason: false, greenlight: greenlightLevel("throwing", ["green"], 17) });
    const adult = weeklyThrowTarget({ group: "outfield", sport: "baseball", age: 20, lastWeekRaw: 300, inSeason: false, greenlight: greenlightLevel("throwing", ["green"], 20) });
    expect(adult.weekly).toBe(315);
    expect(youth.weekly).toBe(300);
    expect(youth.hidden).toBe(true);
    expect(adult.hidden).toBe(false);
    expect(throwTargetLine("outfield", youth)).toBe("");
  });

  it("no logged throws asks for a starting point instead of guessing", () => {
    expect(weeklyThrowTarget({ group: "outfield", sport: "baseball", age: 16, lastWeekRaw: null, inSeason: false }).needsStart).toBe(true);
  });

  it("softball uses 60-ft bases for 11+", () => {
    expect(fieldDistances("softball", 15).bases).toBe(60);
  });

  it("reports cap conflicts instead of overriding them", () => {
    const report: Record<string, string[]> = {};
    for (const sport of ["baseball", "softball"] as const) for (const age of [12, 15, 17, 20]) report[`${sport} ${age}`] = groups.flatMap(g => fullGoConflicts(g, sport, age));
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 1));
    expect(report["baseball 12"].length).toBeGreaterThan(0);
  });
});
