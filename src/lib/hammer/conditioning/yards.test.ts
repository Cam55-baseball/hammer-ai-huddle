import { describe, it, expect } from "vitest";
import { pitcherYardTarget, repsForYards, capSessionYards, sessionYards, judgeReps, BASE_YARDS, feetToYards, SESSION_YARD_CAP } from "../../../../supabase/functions/_shared/wic/conditioning/yards";

describe("conditioning yards (owner Oct 31)", () => {
  it("base lengths: baseball 30 yd, softball 20 yd, 90 ft = 30 yd", () => {
    expect(BASE_YARDS).toEqual({ baseball: 30, softball: 20 });
    expect(feetToYards(90)).toBe(30);
  });
  it("starter builds 300 → 1000 yd over 8 weeks", () => {
    const w = Array.from({ length: 8 }, (_, i) => pitcherYardTarget("starter", i).yards);
    expect(w[0]).toBe(300); expect(w[7]).toBe(1000);
    expect(pitcherYardTarget("starter", 20).yards).toBe(1000);
  });
  it("bullpen and closer build 300 → 600 yd", () => {
    expect(pitcherYardTarget("closer", 0).yards).toBe(300);
    expect(pitcherYardTarget("bullpen", 7).yards).toBe(600);
    expect(pitcherYardTarget("closer", 7).kind).toBe("repeat_sprint");
  });
  it("low readiness lightens the day", () => {
    expect(pitcherYardTarget("starter", 7, undefined, true).yards).toBe(700);
  });
  it("never more than 1000 yards in a session", () => {
    expect(repsForYards(5000, 90) * 30).toBeLessThanOrEqual(SESSION_YARD_CAP);
    const rows = capSessionYards([{ sets: 20, reps: 1, distance_feet: 90 }, { sets: 20, reps: 1, distance_feet: 180 }]);
    expect(sessionYards(rows)).toBeLessThanOrEqual(1000);
  });
});

describe("smart stop", () => {
  const o = { kind: "max_sprint" as const, prescribedReps: 6, repFeet: 90 };
  it("pain stops right away with a caution", () => {
    const v = judgeReps([{ pain: true }], o);
    expect(v).toMatchObject({ action: "stop", reason: "pain", caution: true });
  });
  it("max sprint more than 8% slower than best stops", () => {
    expect(judgeReps([{ seconds: 4.0, pain: false }, { seconds: 4.33, pain: false }], o)).toMatchObject({ action: "stop", reason: "speed_drop" });
    expect(judgeReps([{ seconds: 4.0, pain: false }, { seconds: 4.3, pain: false }], o)).toEqual({ action: "continue" });
  });
  it("repeat conditioning uses 12%", () => {
    const r = { ...o, kind: "repeat_sprint" as const };
    expect(judgeReps([{ seconds: 4.0, pain: false }, { seconds: 4.4, pain: false }], r)).toEqual({ action: "continue" });
    expect(judgeReps([{ seconds: 4.0, pain: false }, { seconds: 4.5, pain: false }], r)).toMatchObject({ action: "stop" });
  });
  it("Slower twice or effort 9+ twice stops", () => {
    expect(judgeReps([{ feel: "slower", pain: false }, { feel: "slower", pain: false }], o)).toMatchObject({ reason: "slower_twice" });
    expect(judgeReps([{ effort: 9, pain: false }, { effort: 10, pain: false }], o)).toMatchObject({ reason: "effort_high" });
  });
  it("offers 2 more reps when the last two were fast and effort ≤ 7, inside 1000 yd", () => {
    const reps = Array.from({ length: 6 }, () => ({ seconds: 4.0, effort: 6, pain: false }));
    expect(judgeReps(reps, o)).toMatchObject({ action: "offer_more", reps: 2 });
    expect(judgeReps(reps, { ...o, prescribedReps: 6, repFeet: 1500 })).toEqual({ action: "done" });
    expect(judgeReps([...reps, ...reps.slice(0, 2)], { ...o, extraUsed: 2 })).toEqual({ action: "done" });
  });
});
