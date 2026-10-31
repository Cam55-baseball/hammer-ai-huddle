import { describe, it, expect } from "vitest";
import { applyPitcherLiftRule } from "./pitcherRolePlan";
import { liftRule } from "../../../../supabase/functions/_shared/wic/pitching/roleCycle";
import { isLowerBodyLift } from "../../../../supabase/functions/_shared/wic/pitching/roleCycle";

/** Owner Oct 31 (A): lifts are always full body; the day before a start has no lift. */
const lift = [
  { name: "Trap Bar Deadlift", dosage: "4x4" },
  { name: "Bench Press", dosage: "3x5" },
  { name: "Ring Row", dosage: "3x8" },
];
function isSplit(drills: { name: string }[]) {
  if (!drills.length) return false;
  const lower = drills.filter((d) => isLowerBodyLift(d.name)).length;
  return lower === 0 || lower === drills.length;
}

describe("no split lift anywhere", () => {
  it("day before a start removes the whole lift, never leaves upper-only", () => {
    for (const role of ["starter", "bullpen", "closer", null] as const) {
      const r = applyPitcherLiftRule(lift as any, { role, startsTomorrow: true });
      expect(r.drills).toEqual([]);
      expect(r.because.join(" ")).toMatch(/No lift the day before a start/);
    }
  });
  it("other days keep a full-body lift for every role", () => {
    for (const role of ["starter", "bullpen", "closer", null] as const) {
      const r = applyPitcherLiftRule(lift as any, { role, startsTomorrow: false });
      expect(isSplit(r.drills)).toBe(false);
    }
  });
  it("server rule: pre_start is a no-lift day", () => {
    expect(liftRule("starter", "pre_start", "light_mound").noLift).toBe(true);
    expect(liftRule("starter", "long_toss", "rest").noLift).toBe(false);
  });
});
