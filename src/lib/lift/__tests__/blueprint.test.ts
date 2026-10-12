import { describe, it, expect } from "vitest";
import { isolationAllowed, overloadStep, coverageGaps, WEEKLY_MIN, liftBlockRank } from "../../../../supabase/functions/_shared/wic/lift/blueprint";

const base = { region: "lower" as const, verifiedMax: 200, repRange: [3, 5] as [number, number], currentReps: 5, loggedAllReps: true, effort: 7, targetEffort: 8, quality: 4 };

describe("lifting blueprint", () => {
  it("Nordics and Copenhagen planks only in the off-season Add size block", () => {
    expect(isolationAllowed("lift_copenhagen_plank", { phase: "in_season", goalBlock: "add_size" })).toBe(false);
    expect(isolationAllowed("nordic_curl", { phase: "os_q2", goalBlock: null })).toBe(false);
    expect(isolationAllowed("nordic_curl", { phase: "os_q2", goalBlock: "add_size" })).toBe(true);
    expect(isolationAllowed("lift_sl_rdl", { phase: "in_season" })).toBe(true);
  });
  it("reps before load", () => {
    expect(overloadStep({ ...base, currentReps: 4 })).toEqual({ kind: "reps", reps: 5 });
  });
  it("lower load step is +5% rounded down to a 5 lb plate", () => {
    expect(overloadStep(base)).toEqual({ kind: "load", newMax: 210 });
  });
  it("upper +2.5% below one plate holds", () => {
    expect(overloadStep({ ...base, region: "upper", verifiedMax: 100 })).toEqual({ kind: "hold", reason: "below_one_plate" });
  });
  it("no step without qualifying logs or a verified max", () => {
    expect(overloadStep({ ...base, loggedAllReps: false }).kind).toBe("hold");
    expect(overloadStep({ ...base, effort: 9 }).kind).toBe("hold");
    expect(overloadStep({ ...base, quality: 3 }).kind).toBe("hold");
    expect(overloadStep({ ...base, verifiedMax: null }).kind).toBe("hold");
  });
  it("in-season minimums never exceed off-season", () => {
    for (const a of Object.keys(WEEKLY_MIN.in) as (keyof typeof WEEKLY_MIN.in)[]) expect(WEEKLY_MIN.in[a]).toBeLessThanOrEqual(WEEKLY_MIN.off[a]);
    expect(coverageGaps({}, "in")).toHaveLength(11);
  });
  it("primer comes before the main lower lift, upper after the second lower", () => {
    expect(liftBlockRank("primer_main")).toBeLessThan(liftBlockRank("main_lower"));
    expect(liftBlockRank("second_lower")).toBeLessThan(liftBlockRank("upper"));
  });
});

import { TRUNK_FINISHER_SLUGS } from "../../../../supabase/functions/_shared/wic/engines/strength";
describe("trunk finisher pool", () => {
  it("drops Copenhagen outside Add size, keeps it inside", () => {
    const pool = (b: string | null) => TRUNK_FINISHER_SLUGS.filter((s) => isolationAllowed(s, { phase: "os_q1", goalBlock: b }));
    expect(pool(null)).not.toContain("lift_copenhagen_plank");
    expect(pool(null).length).toBe(TRUNK_FINISHER_SLUGS.length - 1);
    expect(pool("add_size")).toContain("lift_copenhagen_plank");
  });
});

import { readFileSync } from "node:fs";
import { slotRank } from "../../../../supabase/functions/_shared/wic/lift/blueprint";
describe("lift-day order in the plan builder", () => {
  it("lift slots are added in blueprint order", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    const main = src.slice(0, src.indexOf("Full-body guardrail"));
    const slots = [...main.matchAll(/push\("lift", "([a-z_]+)"/g)].map((m) => m[1]).filter((s) => s !== "mobility");
    const ranks = slots.map(slotRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(slots.indexOf("compound_lower")).toBeLessThan(slots.indexOf("unilateral_lower"));
  });
});

import { robustnessAreas, robustnessPool, ROBUSTNESS_POOLS, ROBUSTNESS_IN_SEASON_SETS, IN_SEASON_SESSION_SET_CAP } from "../../../../supabase/functions/_shared/wic/lift/blueprint";
import { areasOf } from "../../../../supabase/functions/_shared/wic/lift/areaMap";
describe("robustness slot (owner Option B)", () => {
  it("is on every lift day, every phase", () => {
    for (const p of ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"])
      for (let d = 0; d < 7; d++) expect(robustnessAreas(p, d, 20000 + d).length).toBeGreaterThan(0);
  });
  it("never holds Nordics or Copenhagen, even in Add size", () => {
    for (const a of Object.keys(ROBUSTNESS_POOLS) as any[])
      for (const s of robustnessPool(a, { phase: "os_q1", goalBlock: "add_size" })) expect(s).not.toMatch(/nordic|copenhagen|leg_curl/);
  });
  it("in-season is 1 set each, total-body power every lift day, under the 13-set cap", () => {
    expect(ROBUSTNESS_IN_SEASON_SETS).toBe(1);
    expect(IN_SEASON_SESSION_SET_CAP).toBe(13);
    expect(robustnessAreas("in_season", 0, 20000)).toEqual(["power", "hamstring"]);
    expect(robustnessAreas("in_season", 4, 20004)[0]).toBe("power");
  });
  it("off-season three lift days cover hamstrings, hips, calves and squats", () => {
    const early = [0, 1, 2].flatMap((d) => robustnessAreas("os_q1", d, 0));
    expect(new Set(early)).toEqual(new Set(["hamstring", "hip_ext", "calf_foot", "hip_rotation", "squat"]));
    const late = [0, 1, 2].flatMap((d) => robustnessAreas("os_q3", d, 0));
    expect(late.filter((a) => a === "squat")).toHaveLength(2);
  });
  it("every pool exercise counts toward its own area", () => {
    for (const [a, slugs] of Object.entries(ROBUSTNESS_POOLS))
      for (const s of slugs) if (a !== "squat" && a !== "hinge") expect(areasOf(s)[0]).toBe(a);
  });
});
