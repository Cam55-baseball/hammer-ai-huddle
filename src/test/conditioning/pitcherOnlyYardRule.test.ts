import { describe, expect, it } from "vitest";
import { conditioningProgram, pitcherYardRuleApplies, yardsLeftToday, judgeReps } from "../../../supabase/functions/_shared/wic/conditioning/yards";
import { ownerConditioningLine } from "../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";
import { planPowerPrimer } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";

// Owner Nov 1 round 4, item 5: the 1000-yard rule is for pitchers only.
describe("1000-yard rule: pitchers only", () => {
  for (const sport of ["baseball", "softball"]) {
    it(`${sport}: Complete Pitcher gets the yard rule`, () => {
      expect(pitcherYardRuleApplies(sport, [`${sport}_pitcher`], null)).toBe(true);
    });
    it(`${sport}: 5Tool never gets the yard rule`, () => {
      expect(pitcherYardRuleApplies(sport, [`${sport}_5tool`], null)).toBe(false);
      expect(pitcherYardRuleApplies(sport, [`${sport}_5tool`], "pitcher")).toBe(false);
    });
    it(`${sport}: Golden 2Way follows the marked primary`, () => {
      expect(conditioningProgram(sport, [`${sport}_golden2way`], "pitcher")).toBe("pitcher");
      expect(conditioningProgram(sport, [`${sport}_golden2way`], "position")).toBe("position");
    });
    it(`${sport}: the other sport's plan never bleeds over`, () => {
      const other = sport === "baseball" ? "softball" : "baseball";
      expect(pitcherYardRuleApplies(sport, [`${other}_pitcher`], null)).toBe(false);
    });
  }
  it("no 'max 1000 yd' wording for non-pitchers", () => {
    const d = { rounds: 4, distance_feet: 180, contacts: null, load_lbs: null, work_seconds: 0, rest_seconds: 60, bases_per_rep: null, base_distance_feet: null, low: false } as any;
    expect(ownerConditioningLine("Shuttle", d, false)).not.toMatch(/1000/);
    expect(ownerConditioningLine("Shuttle", d, true)).toMatch(/max 1000 yd/);
  });
  it("non-pitchers: yards left is null (no cap); pitchers count every conditioning yard", () => {
    expect(yardsLeftToday(false, [{ sets: 10, reps: 1, distance_feet: 2700 }])).toBeNull();
    expect(yardsLeftToday(true, [{ sets: 3, reps: 10, distance_feet: 90 }])).toBe(100);
  });
  it("Add more reps is offered past 1000 yd only without a cap", () => {
    const reps = Array.from({ length: 11 }, () => ({ seconds: 4, feel: "same" as const, effort: 5, pain: false }));
    expect(judgeReps(reps, { kind: "repeat_sprint", prescribedReps: 11, repFeet: 270, capYards: 1000 }).action).toBe("done");
    expect(judgeReps(reps, { kind: "repeat_sprint", prescribedReps: 11, repFeet: 270, capYards: null }).action).toBe("offer_more");
  });
});

describe("Power Primer sprints count toward a pitcher's 1000 yd", () => {
  const base = {
    sport: "baseball", role: "position", age: 20, growthMode: false, readiness: 90, pain: {},
    dayHas: { velocityThrow: false, batSpeed: false, hardRun: false }, gameTomorrow: false,
    daysSinceStart: null, daysUntilStart: null, realThrowDaysThisWeek: 0, realThrowsEnabled: false,
    goals: ["speed"], equipment: null,
    firstLift: { slug: "trap_bar_deadlift", name: "Trap Bar Deadlift", pattern: "hinge", heavy: true },
  } as any;
  it("no fixed set cap: only a score dip, throw limit or yard total stops it", () => {
    const pp = planPowerPrimer(base).block;
    if (pp?.action.distance_feet) expect(pp.max_total_reps).toBeNull();
  });
  it("sprint reps are bounded by the yards left", () => {
    const pp = planPowerPrimer({ ...base, sprintYardsLeft: 40 }).block;
    if (pp?.action.distance_feet) expect(pp.max_total_reps! * (pp.action.distance_feet / 3)).toBeLessThanOrEqual(40);
  });
  it("no room for a full sprint set → no sprint primer", () => {
    const pp = planPowerPrimer({ ...base, sprintYardsLeft: 10 }).block;
    expect(pp?.action.distance_feet ?? null).toBeNull();
  });
});
