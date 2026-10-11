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
    expect(unreachableAreas(allPlannerSlugs(), AREAS)).toEqual([]);
  });
});

import { oppositeLowerPool } from "../../../../supabase/functions/_shared/wic/lift/areaMap";
describe("opposite second lower lift", () => {
  const pool = S.unilateralSlugs(false, 0);
  it("squat main → hinge/hip second", () => {
    const p = oppositeLowerPool(pool, "goblet_squat", 0);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((s) => ["hinge", "hip_ext"].includes(areasOf(s)[0]))).toBe(true);
  });
  it("hinge main → squat/groin second", () => {
    expect(oppositeLowerPool(pool, "rdl_concentric", 1).every((s) => ["squat", "groin_lateral"].includes(areasOf(s)[0]))).toBe(true);
  });
  it("every third day leads with side-to-side work, in and out of season", () => {
    expect(oppositeLowerPool(pool, "goblet_squat", 2).length).toBeGreaterThan(0);
    expect(oppositeLowerPool(S.unilateralSlugs(true, 2), "goblet_squat", 2)).toEqual(["lateral_db_step_up"]);
  });
  it("only ever returns candidates from the pool", () => {
    expect(oppositeLowerPool(pool, "goblet_squat", 0).every((s) => pool.includes(s))).toBe(true);
  });
});
