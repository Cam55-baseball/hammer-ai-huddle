import { describe, it, expect } from "vitest";
import { goalDose, goalDoseKey, repCeiling, goalTaper, type GoalDoseKey } from "../../../supabase/functions/_shared/wic/goals/goalDose";

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "preseason", "in_season", "post_season", null];
const KEYS: (GoalDoseKey | null)[] = ["explode", "strength", "size", "faster", "healthy", "lean", null];
const ROLES = ["compound_lower", "compound_upper", "unilateral_lower", "upper_push", "upper_pull", "accessory", "core", "arm_care", "carry_antirotation"];

describe("Off-season goal table v2 — simulations across phases", () => {
  it("zero bleed outside off-season, ceilings, gates and caps all hold", () => {
    let changes = 0, cases = 0; const bad: string[] = [];
    for (const ph of PHASES) for (const k of KEYS) for (const k2 of KEYS) for (const role of ROLES)
      for (const sets of [2, 3, 4, 5]) for (const reps of [2, 3, 5, 6, 8, 10, 12]) for (const pct of [null, 60, 67, 72, 77, 82, 87])
        for (const age of [11, 14, 16, 17, 20]) for (const yrs of [1, 5]) for (const rd of [null, 30, 50, 80]) for (const growth of [false, true]) for (const dl of [false, true]) {
          cases++;
          const r = goalDose({ seasonPhase: ph, key: k, secondKey: k2, isDeloadWeek: dl, trendLighter: false, role, category: null, sets, reps, loadPct: pct, age, trainingYears: yrs, readiness: rd, growthMode: growth });
          if (!r) continue;
          changes++;
          const add = (m: string) => { if (bad.length < 10) bad.push(`${m} ${JSON.stringify({ ph, k, k2, role, sets, reps, pct, age, yrs, rd, growth, dl, r })}`); };
          if (goalTaper(ph) === 0) add("bleed outside off-season");
          if (dl) add("deload not winning");
          if (rd != null && rd < 40) add("low readiness changed");
          if (r.sets > sets && (goalTaper(ph) < 1 || growth || age < 13)) add("added sets when not allowed");
          if (r.sets - sets > 1 || (r.sets > sets && (r.sets - sets) / sets > 0.3)) add("> +30% sets");
          const c = repCeiling(pct, age, yrs);
          if (c == null || r.reps > c) add("rep ceiling");
          if (["arm_care", "carry_antirotation"].includes(role)) add("touched arm care/carry");
          if (r.sets > 5) add("over 5 sets");
        }
    expect(bad).toEqual([]);
    expect(changes).toBeGreaterThan(1000);
    expect(cases).toBeGreaterThan(100000);
    console.log("goal v2 sim", { cases, changes });
  }, 120_000);

  it("taper: full in Q1–Q2, no added sets in Q3, nothing in Q4 ramp-up", () => {
    const base = { key: "strength" as const, isDeloadWeek: false, trendLighter: false, role: "compound_lower", category: null, sets: 4, reps: 8, loadPct: 70, age: 20, trainingYears: 5 };
    expect(goalDose({ ...base, seasonPhase: "os_q1" })).toEqual({ sets: 5, reps: 5 });
    expect(goalDose({ ...base, seasonPhase: "os_q3" })?.sets ?? 4).toBe(4);
    expect(goalDose({ ...base, seasonPhase: "os_q4" })).toBeNull();
    expect(goalDose({ ...base, seasonPhase: "in_season" })).toBeNull();
  });

  it("85%+ is 3 reps for trained adults, 2 for 16–17, not touched under 16", () => {
    expect(repCeiling(87, 20, 5)).toBe(3);
    expect(repCeiling(87, 17, 5)).toBe(2);
    expect(repCeiling(87, 15, 5)).toBeNull();
    expect(repCeiling(77, 20, 2)).toBe(5);
  });

  it("goal sources map to the table", () => {
    expect(goalDoseKey("throwing")).toBe("explode");
    expect(goalDoseKey("speed")).toBe("faster");
    expect(goalDoseKey("strength", "add muscle")).toBe("size");
    expect(goalDoseKey("durability")).toBe("healthy");
  });
});
