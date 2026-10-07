import { describe, it, expect } from "vitest";
import { limbGuidance, attachLimbHints } from "../../../supabase/functions/_shared/wic/limb/limbGuidance";

describe("limb guidance — safety first, text only", () => {
  it("never changes rows and goes quiet under growth, pain and youth", () => {
    let violations = 0, cases = 0;
    for (let age = 7; age <= 24; age++) for (const growth of [false, true]) for (const leg of [false, true]) for (const arm of [false, true])
      for (const sport of ["baseball", "softball"] as const) for (let h = 48; h <= 80; h += 1) for (const ws of [-3, 0, 2, 4, 6]) {
        cases++;
        const a = { height_in: h, wingspan_in: h + ws, leg_length_in: h * 0.5, arm_total_in: h * 0.44, torso_in: h * 0.3, femur_in: h * 0.26, weight_lbs: h * 2.2 };
        const g = limbGuidance({ anthropometrics: a, age, sport, growthMode: growth, pain: { leg, arm } });
        if ((growth || leg || age < 11) && g.stride) violations++;
        if ((arm || age < 9) && g.extension) violations++;
        if (g.extension && /lower|raise|change your arm slot/i.test(g.extension)) violations++;
        if (leg && g.mobility?.includes("long legs")) violations++;
        const rows = [{ slot: "speed", sequence_role: "main", sets: 3, reps: 4, movement_slug: "x" }, { slot: "lift", sequence_role: "main_compound", sets: 4, reps: 5, movement_slug: "y" }];
        const out = attachLimbHints(rows as any, g);
        out.forEach((r: any, i) => { if (r.sets !== rows[i].sets || r.reps !== rows[i].reps || r.movement_slug !== rows[i].movement_slug) violations++; });
        if (out.length !== rows.length) violations++;
      }
    expect(cases).toBeGreaterThan(40000);
    expect(violations).toBe(0);
  });
  it("no data → no hints", () => {
    const g = limbGuidance({ anthropometrics: null, age: 15, sport: "baseball", growthMode: false, pain: {} });
    expect([g.stride, g.extension, g.bat, g.mobility]).toEqual([null, null, null, null]);
  });
});
