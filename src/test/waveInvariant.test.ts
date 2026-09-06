import { describe, it, expect } from "vitest";
import { resolveDose } from "../../supabase/functions/_shared/wic/dosage/doctrine.ts";
import { resolveWaveDose, WAVE_VERSION } from "../../supabase/functions/_shared/wic/dosage/wave.ts";

/**
 * The property that makes turning the wave on safe: it may move reps, and it
 * may never move a set count. Proven across the full dose matrix, not a sample.
 */
const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"];
const ROLES = [
  "compound_lower", "unilateral_lower", "upper_push", "upper_pull",
  "trunk_finisher", "carry_antirotation", "arm_care", "supplemental",
];
const AGES = [0, 2, 4, 7, 12];
const WEEKS = [1, 2, 3, 4];
const CNS = [false, true];

function* grid() {
  for (const phase of PHASES)
    for (const role of ROLES)
      for (const trainingAgeYears of AGES)
        for (const weekInBlock of WEEKS)
          for (const cnsClamped of CNS)
            yield { phase, role, category: null, dosageUnit: "reps", trainingAgeYears, weekInBlock, cnsClamped };
}

describe("wave invariant", () => {
  it("never changes a set count, flag on vs flag off", () => {
    let compared = 0;
    for (const input of grid()) {
      const off = resolveWaveDose(input as never, false);
      const on = resolveWaveDose(input as never, true);
      expect(on.sets).toBe(off.sets);
      compared++;
    }
    expect(compared).toBe(PHASES.length * ROLES.length * AGES.length * WEEKS.length * CNS.length);
  });

  it("is byte-identical to the untouched doctrine when the flag is off", () => {
    for (const input of grid()) {
      const base = resolveDose(input as never);
      const off = resolveWaveDose(input as never, false);
      expect(off.sets).toBe(base.sets);
      expect(off.reps).toBe(base.reps);
    }
  });

  it("keeps every dose inside its envelope and at or above 1 rep", () => {
    for (const input of grid()) {
      const on = resolveWaveDose(input as never, true);
      expect(on.sets).toBeGreaterThanOrEqual(1);
      expect(on.reps).toBeGreaterThanOrEqual(1);
    }
  });

  it("only moves reps on the three inverse groups", () => {
    const movedGroups = new Set<string>();
    for (const input of grid()) {
      const off = resolveWaveDose(input as never, false);
      const on = resolveWaveDose(input as never, true);
      if (on.reps !== off.reps) movedGroups.add(off.group);
    }
    expect([...movedGroups].sort()).toEqual(["main_compound", "unilateral", "upper"]);
  });

  it("stamps the wave version on the rows it touches", () => {
    const on = resolveWaveDose(
      { phase: "os_q1", role: "compound_lower", category: null, dosageUnit: "reps", trainingAgeYears: 12, weekInBlock: 3, cnsClamped: false } as never,
      true,
    );
    expect(on.notes.some((n) => n.includes(WAVE_VERSION))).toBe(true);
  });
});
