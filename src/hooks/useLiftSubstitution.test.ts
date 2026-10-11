import { describe, it, expect } from "vitest";
import { projectedDose, type SwapCandidate } from "./useLiftSubstitution";
import { inlineLogSpec } from "@/components/hammer/logging/InlinePrescriptionLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const rx = (o: Partial<WkRx>) =>
  ({ movement_slug: "trap_bar_deadlift", movement_name: "Trap Bar Deadlift", sets: 3, reps: 5, dosage_unit: "reps", slot: "lift", ...o }) as WkRx;

const cand = (o: Partial<SwapCandidate>): SwapCandidate => ({
  slug: "x", name: "X", movement_category: null, default_sets: null, default_reps: null,
  default_duration_seconds: null, default_distance_feet: null, default_total_reps: null,
  dosage_unit: null, equipment_requirements: null, cue: null, ...o,
});

describe("alternative swap keeps log rows in sync", () => {
  it("same-unit swap carries the prescribed dose over unchanged", () => {
    const d = projectedDose(rx({}), cand({ slug: "barbell_squat", dosage_unit: "reps" }));
    expect([d.sets, d.reps, d.dosage_unit]).toEqual([3, 5, "reps"]);
  });

  it("reps → seconds swap adopts the replacement's seconds and drops stale rep values", () => {
    const d = projectedDose(rx({}), cand({ slug: "copenhagen_hold", dosage_unit: "seconds", default_sets: 3, default_duration_seconds: 20 }));
    expect(d.dosage_unit).toBe("seconds");
    expect(d.duration_seconds).toBe(20);
    expect(d.reps).toBeNull();
    expect(d.total_reps).toBeNull();
    // The log rows rendered from the swapped row must be seconds rows, not rep rows.
    const spec = inlineLogSpec(rx({ movement_slug: "copenhagen_hold", movement_name: "Copenhagen Hold", dosage_unit: "seconds", duration_seconds: d.duration_seconds, reps: d.reps as any, total_reps: d.total_reps as any }));
    expect(spec.fields.map((f) => f.key)).toEqual(["time"]);
    expect(spec.fields[0].prefill).toBe(20);
    expect(spec.rows).toBe(3);
  });

  it("time_restriction still trims sets to the lighter default", () => {
    const d = projectedDose(rx({ sets: 4 }), cand({ slug: "goblet_squat", dosage_unit: "reps", default_sets: 2 }), "time_restriction");
    expect(d.sets).toBe(2);
  });

  it("the swapped row's log spec matches the projected dose exactly (rows = sets, prefill = per-set value)", () => {
    const d = projectedDose(rx({ sets: 4, reps: 6 }), cand({ slug: "front_squat", dosage_unit: "reps" }));
    const spec = inlineLogSpec(rx({ movement_slug: "front_squat", movement_name: "Front Squat", sets: d.sets, reps: d.reps }));
    expect(spec.rows).toBe(d.sets);
    expect(spec.fields[0].prefill).toBe(d.reps);
  });
});
