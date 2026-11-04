import { describe, expect, it } from "vitest";
import { catchPlayPlanInputs, inSessionDefenseGate, catchPlayDay, defenseThrowsAllowed, DEFAULT_CATCH_PLAY_STANDARDS as S, type CatchPlayFacts } from "../../supabase/functions/_shared/wic/throwing/catchPlay";
import { factsFromRows } from "../../supabase/functions/_shared/wic/throwing/readCatchPlayFacts";
import { applyCatchPlayCheck } from "@/lib/hammer/catchPlayCheck";

const TODAY = "2026-11-10";
const ago = (n: number) => new Date(Date.parse(`${TODAY}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const p = { today: TODAY, sport: "baseball" as const, position: "IF" as const, age: 25 };
const base: CatchPlayFacts = { checkins: [{ date: ago(1), readiness: 0.8, armFlag: false }], clips: [{ date: ago(10), faultKeys: [] }], sessions: [], startingDistanceFt: null, startingThrowDays: null };
const day = (r: ReturnType<typeof catchPlayPlanInputs>) => catchPlayDay({ date: TODAY, sport: "baseball", position: "IF", age: 25, phase: "pre", isPitcher: false, restDay: false, gameToday: false, gameYesterday: false, gameTomorrow: false, heavyYesterday: false, lowReadiness: false, trainingDayIndex: 3, earn: r.earn, progress: r.progress, buildUp: r.buildUp, standards: S });

describe("plan-time throw readiness (owner Nov 4)", () => {
  it("logs path: full pain-free catch play to the position distance in recent sessions → throw-ready, Defense keeps throws", () => {
    const r = catchPlayPlanInputs({ ...base, sessions: [1, 2].map((n) => ({ date: ago(n), maxDistanceFt: 120, painFree: true, armFeelGood: true })) }, p, S);
    expect(r.throwReady).toMatchObject({ ready: true, via: "logs" });
    expect(r.buildUp).toBeNull();
    expect(defenseThrowsAllowed(day(r), null).allowed).toBe(true);
  });
  it("starting-answers path: no logs, current routine at/above position distance, no arm flags → throw-ready", () => {
    const r = catchPlayPlanInputs({ ...base, startingDistanceFt: 150, startingThrowDays: 3 }, p, S);
    expect(r.throwReady).toMatchObject({ ready: true, via: "starting_answers" });
    expect(defenseThrowsAllowed(day(r), null).allowed).toBe(true);
  });
  it("starting answers below the distance, or with an arm flag → build-up ladder, Defense dry", () => {
    const low = catchPlayPlanInputs({ ...base, startingDistanceFt: 90, startingThrowDays: 3 }, p, S);
    expect(low.throwReady.ready).toBe(false); expect(low.buildUp).toEqual({ active: true, distanceFt: 90 });
    expect(defenseThrowsAllowed(day(low), null).allowed).toBe(false);
    const flagged = catchPlayPlanInputs({ ...base, checkins: [{ date: ago(2), readiness: 0.8, armFlag: true }], startingDistanceFt: 150, startingThrowDays: 3 }, p, S);
    expect(flagged.throwReady.ready).toBe(false);
  });
  it("new player with neither logs nor answers starts on the first build-up step", () => {
    const r = catchPlayPlanInputs(base, p, S);
    expect(r.buildUp).toEqual({ active: true, distanceFt: 45 }); expect(day(r).kind).toBe("build_up");
  });
  it("logs that are short or painful → not ready, build-up", () => {
    const r = catchPlayPlanInputs({ ...base, sessions: [{ date: ago(1), maxDistanceFt: 90, painFree: true, armFeelGood: true }, { date: ago(2), maxDistanceFt: 120, painFree: false, armFeelGood: false }] }, p, S);
    expect(r.throwReady.ready).toBe(false); expect(r.buildUp?.active).toBe(true);
  });
  it("unknown check-ins never earn long toss", () => {
    expect(catchPlayPlanInputs({ ...base, checkins: null }, p, S).earn.longToss).toBe(false);
  });
});

describe("in-session switch", () => {
  const blocks = [{ modality: "defense", because: [] as string[], drills: [{ name: "Short-hop throws to first", dosage: "10 throws" }, { name: "Ready-position reads", dosage: "3x5" }] }];
  it("cut short, painful or below the distance → Defense loses its throws with the plain reason", () => {
    for (const outcome of ["cut_short", "painful", "short_distance"] as const) {
      const out = applyCatchPlayCheck(blocks, { outcome, maxDistanceFt: 90, positionDistanceFt: 120 });
      expect(out[0].drills.map((d) => d.name)).toEqual(["Ready-position reads"]);
      expect(out[0].because?.[0]).toMatch(/reads, hands and footwork/);
    }
  });
  it("full catch play keeps Defense throws; no check keeps the plan", () => {
    expect(applyCatchPlayCheck(blocks, { outcome: "full", maxDistanceFt: 120, positionDistanceFt: 120 })[0].drills).toHaveLength(2);
    expect(inSessionDefenseGate(null).allowed).toBe(true);
  });
});

describe("server facts reader", () => {
  it("maps check-ins, throwing findings, checks and starting answers", () => {
    const f = factsFromRows({
      quizzes: [{ entry_date: ago(1), physical_readiness: 4, pain_location: ["right_shoulder"] }],
      findings: [{ skill_domain: "throwing", sport: "baseball", video_id: "v", created_at: `${ago(5)}T10:00:00Z`, fault_key: null, movement_key: "arm_lag" }, { skill_domain: "hitting", sport: "baseball", video_id: "h", created_at: `${ago(5)}T10:00:00Z`, movement_key: "flat_path" }],
      checks: [{ plan_date: ago(1), payload: { outcome: "full", maxDistanceFt: 120, positionDistanceFt: 120 } }],
      answers: { throw_distance: "120–150 ft", throw_days: "3–4" },
    }, "baseball");
    expect(f.checkins?.[0]).toMatchObject({ armFlag: true });
    expect(f.clips).toEqual([{ date: ago(5), faultKeys: ["arm_lag"] }]);
    expect(f.sessions[0]).toMatchObject({ maxDistanceFt: 120, painFree: true });
    expect(f).toMatchObject({ startingDistanceFt: 120, startingThrowDays: 3 });
  });
});
