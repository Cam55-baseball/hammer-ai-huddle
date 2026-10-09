import { describe, it, expect } from "vitest";
import { inlineLogSpec } from "./InlinePrescriptionLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const rx = (o: Partial<WkRx>) => ({ movement_slug: "", movement_name: "", sets: 2, reps: 8, slot: "lift", ...o }) as WkRx;
const keys = (r: WkRx) => inlineLogSpec(r).fields.map((f) => f.key);

describe("inline lift log fields", () => {
  it("band work shows reps only, never weight", () => {
    expect(keys(rx({ movement_slug: "arm_care_band_full_chart", movement_name: "Arm-Care Band — Full Chart" }))).toEqual(["reps"]);
  });
  it("a loaded lift shows reps and weight, one row per set", () => {
    const s = inlineLogSpec(rx({ movement_slug: "trap_bar_deadlift", movement_name: "Trap Bar Deadlift", sets: 3, reps: 5 }));
    expect(s.fields.map((f) => f.key)).toEqual(["reps", "weight"]);
    expect(s.rows).toBe(3);
    expect(s.fields[0].prefill).toBe(5);
  });
  it("a '30 reps total' card logs rows that add up to 30, never 2 × 30", () => {
    const s = inlineLogSpec(rx({ movement_slug: "wost_tennis_ball_self_rally", slot: "cross_sport" as any, sets: 2, reps: null as any, total_reps: 30 }));
    expect(s.rows * (s.fields[0].prefill ?? 0)).toBe(30);
    const t = inlineLogSpec(rx({ movement_slug: "x", sets: 3, reps: 10, total_reps: 30 }));
    expect([t.rows, t.fields[0].prefill]).toEqual([3, 10]);
  });
});
