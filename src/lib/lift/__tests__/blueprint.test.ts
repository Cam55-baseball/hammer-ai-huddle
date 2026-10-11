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
