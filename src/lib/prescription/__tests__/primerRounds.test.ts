import { describe, it, expect } from "vitest";
import { primerState, type PrimerRules } from "../primerRounds";
import { planPowerPrimer } from "../../../../supabase/functions/_shared/wic/pap/powerPrimer";

const sprint: PrimerRules = { max_sets: 4, max_total_reps: null, stop: { kind: "sprint", drop_pct: 3 }, actionReps: 1, realThrow: false };
const throws: PrimerRules = { max_sets: 4, max_total_reps: 5, stop: { kind: "throw_swing", drop_pct: 5, in_a_row: 1 }, actionReps: 1, realThrow: true };
const seq = (r: number[], v: (number | null)[] = []) => r.map((rating, i) => ({ rating, value: v[i] ?? null }));

describe("power primer inside the lift", () => {
  it("5,5,4,3 stops right after the 3", () => {
    const s = primerState(sprint, seq([5, 5, 4, 3]));
    expect([s.done, s.next]).toEqual([4, false]);
    expect(primerState(sprint, seq([5, 5, 4])).next).toBe(true);
  });
  it("4,4,4,… stops at the set cap", () => {
    const s = primerState({ ...sprint, max_sets: 3 }, seq([4, 4, 4, 4, 4]));
    expect([s.done, s.next]).toEqual([3, false]);
    expect(s.stopReason).toMatch(/limit/);
  });
  it("a 3% slower sprint stops even when rated 5", () => {
    expect(primerState(sprint, seq([5, 5], [1.6, 1.65])).next).toBe(false);
    expect(primerState(sprint, seq([5, 5], [1.6, 1.62])).next).toBe(true);
  });
  it("a 5% speed drop on throws stops", () => {
    expect(primerState(throws, seq([5, 5], [80, 76])).next).toBe(false);
    expect(primerState(throws, seq([5, 5], [80, 77])).next).toBe(true);
  });
  it("real throws count 1.5 in the arm ledger and never pass 5 a session", () => {
    const s = primerState({ ...throws, actionReps: 2 }, seq([5, 5, 5, 5]));
    expect(s.realThrows).toBeLessThanOrEqual(5);
    expect(s.armUnits).toBe(s.realThrows * 1.5);
    expect(primerState(throws, seq([5, 4])).armUnits).toBe(3);
  });
  it("an unrated round holds the next explosive set back", () => {
    expect(primerState(sprint, [{ rating: null, value: 1.6 }]).done).toBe(0);
  });
  it("builder gates still block the primer (all existing rules unchanged)", () => {
    expect(typeof planPowerPrimer).toBe("function");
  });
});
