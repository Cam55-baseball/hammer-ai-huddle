import { describe, it, expect } from "vitest";
import { primerCarryExercises, planPowerPrimer } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";
import { primerSlots, primerState } from "@/lib/prescription/primerRounds";

// A rebuilt full-body lift day (order as saved).
const day = [
  { slot: "warmup", sequence_role: "warmup", movement_slug: "wu_carioca", movement_name: "Carioca", sets: 1 },
  { slot: "lift", sequence_role: "compound", movement_slug: "trap_bar_deadlift", movement_name: "Trap Bar Deadlift", sets: 3 },
  { slot: "lift", sequence_role: "unilateral", movement_slug: "rear_foot_split_squat", movement_name: "Split Squat", sets: 3 },
  { slot: "lift", sequence_role: "upper_push", movement_slug: "db_bench_press", movement_name: "DB Bench Press", sets: 3 },
  { slot: "lift", sequence_role: "mobility", movement_slug: "rc_hip_flow", movement_name: "Hip flow", sets: 1 },
];
const swing = { max_sets: 5, max_total_reps: null, stop: { kind: "throw_swing" as const, drop_pct: 5, in_a_row: 2 }, actionReps: 3, realThrow: false };

describe("Power Primer carries between sets across exercises (owner Nov 1 r3)", () => {
  it("starts between the sets of exercise 1 and lists the next strength exercises in order", () => {
    const c = primerCarryExercises(day, day[1], "bat_speed");
    expect(c.map((x) => x.name)).toEqual(["Trap Bar Deadlift", "Split Squat", "DB Bench Press"]);
    const slots = primerSlots(c, "Trap Bar Deadlift", 3);
    expect(slots.slice(0, 4).map((s) => `${s.exercise} ${s.set}`)).toEqual(["Trap Bar Deadlift 1", "Trap Bar Deadlift 2", "Trap Bar Deadlift 3", "Split Squat 1"]);
  });
  it("carries into exercise 2 on good scores", () => {
    const st = primerState(swing, [{ rating: 5, value: 70 }, { rating: 5, value: 71 }, { rating: 4, value: 70 }, { rating: 5, value: 71 }]);
    expect(st.next).toBe(true);
    expect(primerSlots(primerCarryExercises(day, day[1], "bat_speed"), "", 3)[st.done].exercise).toBe("Split Squat");
  });
  it("stops on a dip and the lift continues without it", () => {
    const rating = primerState(swing, [{ rating: 5, value: 70 }, { rating: 5, value: 71 }, { rating: 5, value: 70 }, { rating: 3, value: 69 }]);
    expect(rating.next).toBe(false); expect(rating.done).toBe(4);
    const speed = primerState(swing, [{ rating: 5, value: 72 }, { rating: 5, value: 68 }, { rating: 5, value: 67 }]);
    expect(speed.next).toBe(false); expect(speed.stopReason).toMatch(/speed dropped/);
  });
  it("never carries a throw into a press", () => {
    expect(primerCarryExercises(day, day[1], "throw").map((x) => x.name)).toEqual(["Trap Bar Deadlift", "Split Squat"]);
  });
  it("real throws stay counted against the throw cap", () => {
    const t = { max_sets: 4, max_total_reps: 6, stop: swing.stop, actionReps: 3, realThrow: true };
    const st = primerState(t, [{ rating: 5, value: 80 }, { rating: 5, value: 81 }]);
    expect(st.realThrows).toBe(6); expect(st.next).toBe(false);
  });
});
void planPowerPrimer;
