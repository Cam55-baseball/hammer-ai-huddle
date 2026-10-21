import { describe, it, expect } from "vitest";
import { sprintRestSeconds, conditioningRestAfterRep, prescribedBases, declaredRouteBases } from "../../../../supabase/functions/_shared/wic/runRest";

describe("owner Oct 21 speed rest", () => {
  it("10 yards rests 1 minute", () => expect(sprintRestSeconds(30)).toBe(60));
  it("30 yards rests 3 minutes", () => expect(sprintRestSeconds(90)).toBe(180));
  it("50 yards rests 5 minutes", () => expect(sprintRestSeconds(150)).toBe(300));
  it("60 yards stays capped at 5 minutes", () => expect(sprintRestSeconds(180)).toBe(300));
  it("unknown or invalid distances do not invent rest", () => {
    for (const feet of [null, undefined, 0, -30, NaN, Infinity]) expect(sprintRestSeconds(feet)).toBeNull();
  });
});

describe("owner Oct 21 conditioning rest", () => {
  for (const bases of [1, 2, 3, 4] as const) {
    it(`softball ${bases} bases uses declared 60-foot base paths`, () => {
      const route = { sport: "softball", bases_per_rep: bases, base_distance_feet: 60 };
      expect(declaredRouteBases(route, "softball", 60 * bases)).toBe(bases);
      expect(declaredRouteBases(route, "baseball", 60 * bases)).toBeNull();
      expect(declaredRouteBases(route, "softball", 43)).toBeNull();
    });
  }
  it("rejects mismatched or undeclared softball base paths", () => {
    expect(declaredRouteBases({ sport: "softball", bases_per_rep: 2, base_distance_feet: 90 }, "softball", 180)).toBeNull();
    expect(prescribedBases("bases_home_2nd", 180, null, "softball")).toBeNull();
  });
  it("single then double then single gives 30s, 30s, 300s and resets", () => {
    const single = conditioningRestAfterRep(0, 1);
    expect(single).toEqual({ bases: 1, reachedHome: false, seconds: 30 });
    const double = conditioningRestAfterRep(single.bases, 2);
    expect(double).toEqual({ bases: 3, reachedHome: false, seconds: 30 });
    expect(conditioningRestAfterRep(double.bases, 1)).toEqual({ bases: 0, reachedHome: true, seconds: 300 });
  });
  it("a home run rests 5 minutes immediately", () => expect(conditioningRestAfterRep(0, 4)).toEqual({ bases: 0, reachedHome: true, seconds: 300 }));
  it("a triple counts 3 bases, a following double reaches home and resets", () => {
    expect(conditioningRestAfterRep(0, 3).bases).toBe(3);
    expect(conditioningRestAfterRep(3, 2)).toEqual({ bases: 0, reachedHome: true, seconds: 300 });
  });
  it("does not classify recovery, throwing or a softball 43-foot sprint as bases", () => {
    expect(prescribedBases("rc_easy_flush", 90)).toBeNull();
    expect(prescribedBases("pitcher_field_and_cover", 90)).toBeNull();
    expect(prescribedBases("repeat_43ft_sb", 43)).toBeNull();
    expect(prescribedBases("bases_home_2nd", 180)).toBe(2);
  });
});