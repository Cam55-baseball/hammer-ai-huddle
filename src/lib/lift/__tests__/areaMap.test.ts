import { describe, it, expect } from "vitest";
import { areasOf, weeklyCoverage, unreachableAreas } from "../../../../supabase/functions/_shared/wic/lift/areaMap";
import { AREAS } from "../../../../supabase/functions/_shared/wic/lift/blueprint";
import * as S from "../../../../supabase/functions/_shared/wic/engines/strength";

const allPlannerSlugs = () => {
  const out = new Set<string>();
  for (const p of ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"] as any[])
    for (let d = 0; d < 7; d++) S.compoundSlugsFor(p, d).forEach((s) => out.add(s));
  for (const i of [true, false]) {
    S.unilateralSlugs(i, 0).forEach((s) => out.add(s));
    S.upperPushSlugs(i, 0).forEach((s) => out.add(s));
    S.upperPullSlugs(i, 0).forEach((s) => out.add(s));
    S.carrySlugs(i, 0).forEach((s) => out.add(s));
  }
  [...S.TRUNK_PRIMER_SLUGS, ...S.TRUNK_FINISHER_SLUGS].forEach((s) => out.add(s));
  return [...out];
};

describe("area map", () => {
  it("classifies key lifts", () => {
    expect(areasOf("lift_sl_rdl")[0]).toBe("hinge");
    expect(areasOf("lift_bb_hip_thrust")[0]).toBe("hip_ext");
    expect(areasOf("lift_hang_power_clean")[0]).toBe("power");
    expect(areasOf("slide_lunge")[0]).toBe("groin_lateral");
  });
  it("counts weekly sets by primary area", () => {
    expect(weeklyCoverage([{ slug: "goblet_squat", sets: 3 }, { slug: "lift_farmer_carry", sets: 2 }])).toEqual({ squat: 3, trunk: 2 });
  });
  it("every planner lift maps to an area", () => {
    expect(allPlannerSlugs().filter((s) => areasOf(s).length === 0)).toEqual([]);
  });
  it("reports areas today's lists can't reach (library gaps for B3)", () => {
    // Pinned so the gap is visible; B3 adds exercises and this list must shrink to [].
    expect(unreachableAreas(allPlannerSlugs(), AREAS)).toEqual(["hip_rotation", "calf_foot"]);
  });
});
