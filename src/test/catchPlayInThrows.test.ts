import { describe, expect, it } from "vitest";
import {
  catchPlayDay, earnStatus, standardLadder, longTossDay, armStrengthDay, lightCatch, pitcherIntervalWarmup,
  pullDownCount, maxDistance, buildUpDistance, needsBuildUp, defenseThrowsAllowed, catchPlayStandardsFrom,
  DEFAULT_CATCH_PLAY_STANDARDS as S, positionDistance, type CatchSession, type CPPhase, type CPSport, type CPPosition, type EarnResult,
} from "../../supabase/functions/_shared/wic/throwing/catchPlay";

const total = (r: { throws: number }[]) => r.reduce((n, x) => n + x.throws, 0);
const add = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const TODAY = "2026-11-10";
const green = (n: number, ft: number, end = TODAY): CatchSession[] => Array.from({ length: n }, (_, i) => ({ date: add(end, -1 - i), maxDistanceFt: ft, painFree: true, armFeelGood: true }));
const clean = { date: add(TODAY, -10), faultKeys: [] as string[] };

describe("catch play counted in throws (Part B)", () => {
  it("every row has a throw count and no time or arm-unit text", () => {
    for (const sport of ["baseball", "softball"] as CPSport[]) for (const rows of [standardLadder(sport, "IF", 20), longTossDay(sport, "OF", 20, { greenWeeks: 2 }), armStrengthDay(sport, "IF", 20, { greenWeeks: 0 }), lightCatch(sport, 20), pitcherIntervalWarmup(sport)]) {
      for (const r of rows) { expect(r.dosage).toMatch(/^\d+ft x \d+ throws/); expect(r.dosage).not.toMatch(/min\b|arm units?|budget/i); }
    }
  });
  it("standard baseball ladder ends at the position distance then comes in; ~35–45 throws adult, 25–30 youth", () => {
    const r = standardLadder("baseball", "OF", 20);
    expect(r.map((x) => x.distanceFt)).toEqual([45, 60, 90, 180, 60]);
    expect(total(r)).toBeGreaterThanOrEqual(35); expect(total(r)).toBeLessThanOrEqual(45);
    const y = standardLadder("baseball", "OF", 11);
    expect(Math.max(...y.map((x) => x.distanceFt))).toBeLessThanOrEqual(120);
    expect(total(y)).toBeGreaterThanOrEqual(25); expect(total(y)).toBeLessThanOrEqual(30);
  });
  it("position distances stand as written (baseball and softball)", () => {
    expect(["1B", "IF", "C", "OF"].map((p) => positionDistance("baseball", p as CPPosition, 20))).toEqual([120, 120, 120, 180]);
    expect(["1B", "IF", "C", "OF"].map((p) => positionDistance("softball", p as CPPosition, 20))).toEqual([90, 120, 120, 150]);
  });
  it("light catch is about 35 throws; pitcher interval warm-up matches the published shape", () => {
    expect(total(lightCatch("baseball", 20))).toBe(35);
    expect(pitcherIntervalWarmup("baseball").map((r) => `${r.distanceFt}x${r.throws}`)).toEqual(["30x5", "45x5", "60x10", "75x10", "90x10", "120x10", "90x5", "60x10"]);
  });
  it("arm-strength day ≈ 60–75 throws for adults; pull-downs start at 5 and grow to 15; distance and volume never step the same week", () => {
    expect(pullDownCount(25, { greenWeeks: 0 })).toBe(5);
    expect(pullDownCount(25, { greenWeeks: 20 })).toBe(15);
    for (let g = 0; g < 10; g++) {
      const dUp = maxDistance("baseball", "IF", 25, { greenWeeks: g + 1 }) > maxDistance("baseball", "IF", 25, { greenWeeks: g });
      const vUp = pullDownCount(25, { greenWeeks: g + 1 }) > pullDownCount(25, { greenWeeks: g });
      expect(dUp && vUp).toBe(false);
    }
    const t = total(armStrengthDay("baseball", "IF", 25, { greenWeeks: 10 }));
    expect(t).toBeGreaterThanOrEqual(55); expect(t).toBeLessThanOrEqual(75);
  });
  it("under-13: pull-downs allowed but 3–5 at sub-max; no stretch-out distance cap (owner Nov 4)", () => {
    const r = armStrengthDay("baseball", "OF", 11, { greenWeeks: 30 });
    const pulls = r.filter((x) => x.part === "pull_down");
    expect(total(pulls)).toBeGreaterThanOrEqual(3); expect(total(pulls)).toBeLessThanOrEqual(5);
    expect(pulls.every((x) => /sub-max/.test(x.dosage))).toBe(true);
    expect(maxDistance("baseball", "OF", 11, { greenWeeks: 30 })).toBeGreaterThan(150);
    expect(maxDistance("baseball", "OF", 9, { greenWeeks: 30 })).toBeGreaterThan(120);
  });
  it("owner settings merge over defaults and keep the owner's ceilings", () => {
    const s = catchPlayStandardsFrom({ longTossPerWeek: { in: 3 }, armStrengthPerWeek: { in: 2 }, pullDowns: { adultMax: 40 }, armRiskFaults: ["arm_lag"] });
    expect(s.longTossPerWeek.in).toBe(2); expect(s.armStrengthPerWeek.in).toBe(1); expect(s.pullDowns.adultMax).toBe(15);
    expect(s.armRiskFaults).toEqual(["arm_lag"]);
    expect(catchPlayStandardsFrom(null)).toEqual(S);
  });
});

describe("earning (healthy check-ins + green rule + lower-risk mechanics)", () => {
  const base = { today: TODAY, age: 25, armFlagDates: [] as string[], redCheckinDates: [], armFeelGood: true, lastThrowingAnalysis: clean, armRiskFindingDates: [], sessions: green(2, 120), positionDistanceFt: 120 };
  it("eligible adult earns long toss and arm strength", () => { const e = earnStatus(base); expect(e.longToss && e.armStrength).toBe(true); });
  it("no throwing clip → locked with the unlock line", () => {
    const e = earnStatus({ ...base, lastThrowingAnalysis: null });
    expect(e.armStrength).toBe(false); expect(e.longToss).toBe(true);
    expect(e.unlockMessage).toBe("Record one throwing clip to unlock arm-strength days.");
  });
  it("pain flag in the last 14 days → not earned; unknown check-ins → not earned", () => {
    expect(earnStatus({ ...base, armFlagDates: [add(TODAY, -10)] }).longToss).toBe(false);
    expect(earnStatus({ ...base, armFlagDates: undefined }).longToss).toBe(false);
  });
  it("arm-risk finding in the clip → not earned; one green session is not enough; youth needs 3× the sessions", () => {
    expect(earnStatus({ ...base, lastThrowingAnalysis: { date: clean.date, faultKeys: ["arm_lag"] } }).longToss).toBe(false);
    expect(earnStatus({ ...base, sessions: green(1, 120) }).armStrength).toBe(false);
    expect(earnStatus({ ...base, age: 11, sessions: green(2, 120) }).armStrength).toBe(false);
    expect(earnStatus({ ...base, age: 11, sessions: green(6, 120) }).armStrength).toBe(true);
  });
  it("auto-regress: a flag, red check-in or new arm-risk finding sends the player back ≥1 week", () => {
    for (const k of ["armFlagDates", "redCheckinDates", "armRiskFindingDates"] as const) {
      const e = earnStatus({ ...base, [k]: [add(TODAY, -3)] });
      expect(e.regressed).toBe(true); expect(e.armStrength).toBe(false);
      expect(e.reasons[0]).toMatch(/Back to standard catch play for at least 1 week/);
    }
  });
});

describe("build-up ladder", () => {
  it("who starts: layoff over 14 days, healed within 28 days, new account; unknown history does not", () => {
    expect(needsBuildUp({ today: TODAY, sessions: green(1, 90, add(TODAY, -20)) })).toBe(true);
    expect(needsBuildUp({ today: TODAY, sessions: green(3, 120), healedDate: add(TODAY, -10) })).toBe(true);
    expect(needsBuildUp({ today: TODAY, sessions: [], accountStartDate: TODAY })).toBe(true);
    expect(needsBuildUp({ today: TODAY, sessions: [] })).toBe(false);
    expect(needsBuildUp({ today: TODAY, sessions: green(3, 120) })).toBe(false);
  });
  it("advances one step after two green sessions (adult) and caps at the position distance", () => {
    const since = add(TODAY, -30);
    expect(buildUpDistance("baseball", "OF", 25, [], since)).toBe(45);
    expect(buildUpDistance("baseball", "OF", 25, green(2, 45), since)).toBe(60);
    expect(buildUpDistance("baseball", "IF", 25, green(2, 120), since)).toBe(120);
    expect(buildUpDistance("baseball", "OF", 15, green(2, 45), since)).toBe(45); // youth greenlight: 6 needed
  });
});

const EARNED: EarnResult = { longToss: true, armStrength: true, regressed: false, reasons: [], unlockMessage: null };
const LOCKED: EarnResult = { longToss: false, armStrength: false, regressed: false, reasons: ["No throwing clip on file."], unlockMessage: "Record one throwing clip to unlock arm-strength days." };
function week(phase: CPPhase, earn: EarnResult, opts: { sport?: CPSport; age?: number; pos?: CPPosition; games?: number[] } = {}) {
  return Array.from({ length: 7 }, (_, d) => {
    const g = new Set(opts.games ?? []);
    return catchPlayDay({ date: add(TODAY, d), sport: opts.sport ?? "baseball", position: opts.pos ?? "IF", age: opts.age ?? 20, phase, isPitcher: false, restDay: d === 6,
      gameToday: g.has(d), gameYesterday: g.has(d - 1), gameTomorrow: g.has(d + 1), heavyYesterday: false, lowReadiness: false, trainingDayIndex: d, earn, progress: { greenWeeks: 2 } });
  });
}
const count = (w: ReturnType<typeof week>, k: string) => w.filter((x) => x.kind === k).length;

describe("frequency and gates", () => {
  it("pre-season: 3 long-toss-type days (arm strength replaces 1); in-season: ≤1 arm strength, ≤2 long-toss-type", () => {
    const pre = week("pre", EARNED);
    expect(count(pre, "long_toss") + count(pre, "arm_strength")).toBe(3);
    expect(count(pre, "arm_strength")).toBe(1);
    const inS = week("in", EARNED);
    expect(count(inS, "arm_strength")).toBeLessThanOrEqual(1);
    expect(count(inS, "long_toss") + count(inS, "arm_strength")).toBeLessThanOrEqual(2);
  });
  it("never on rest days or the day before/after a game; locked players get standard catch play with the unlock reason", () => {
    const w = week("pre", EARNED, { games: [1] });
    expect(w[6].kind).toBe("none");
    for (const d of [0, 1, 2]) expect(["long_toss", "arm_strength"]).not.toContain(w[d].kind);
    const l = week("pre", LOCKED);
    expect(count(l, "long_toss") + count(l, "arm_strength")).toBe(0);
    expect(l[0].because).toContain("Record one throwing clip to unlock arm-strength days.");
  });
  it("Defense throws only when today's catch play reaches the position distance and fits the throw limit", () => {
    const std = week("in", LOCKED)[1];
    expect(defenseThrowsAllowed(std, null).allowed).toBe(true);
    expect(defenseThrowsAllowed(std, 10).allowed).toBe(false);
    const light = catchPlayDay({ ...{ date: TODAY, sport: "baseball", position: "OF", age: 20, phase: "in", isPitcher: false, restDay: false, gameToday: false, gameYesterday: true, gameTomorrow: false, heavyYesterday: false, lowReadiness: false, trainingDayIndex: 1, earn: EARNED, progress: { greenWeeks: 0 } } });
    expect(light.kind).toBe("light");
    const g = defenseThrowsAllowed(light, null);
    expect(g.allowed).toBe(false); expect(g.because).toMatch(/light catch only/);
  });
  it("pitchers by role: bullpen → interval warm-up; starter's long-toss day can be arm strength; never 2 days before a start; pen arms only off-season", () => {
    const p = (o: Partial<Parameters<typeof catchPlayDay>[0]>) => catchPlayDay({ date: TODAY, sport: "baseball", position: "P", age: 20, phase: "pre", isPitcher: true, pitcherRole: "starter", pitcherDay: "other", restDay: false, gameToday: false, gameYesterday: false, gameTomorrow: false, heavyYesterday: false, lowReadiness: false, trainingDayIndex: 2, earn: EARNED, progress: { greenWeeks: 0 }, ...o }).kind;
    expect(p({ pitcherDay: "bullpen" })).toBe("pitcher_interval");
    expect(p({ pitcherDay: "long_toss" })).toBe("arm_strength");
    expect(p({ pitcherDay: "start_in_2" })).toBe("standard");
    expect(p({ pitcherRole: "closer", phase: "in" })).toBe("standard");
    expect(p({ pitcherRole: "reliever", phase: "off" })).toBe("arm_strength");
  });
});

describe("8-week simulations (position players and pitchers, both sports, youth/HS/college/pro)", () => {
  const levels: [string, number][] = [["youth", 11], ["high school", 16], ["college", 20], ["pro", 26]];
  for (const sport of ["baseball", "softball"] as CPSport[]) for (const [lvl, age] of levels) for (const pos of ["IF", "OF", "P"] as CPPosition[]) {
    it(`${sport} ${lvl} ${pos}: caps, frequency, counts and auto-regress hold for 8 weeks`, () => {
      const sessions: CatchSession[] = [];
      const FLAG = add("2026-01-05", 29);
      for (let wk = 0; wk < 8; wk++) {
        const phase: CPPhase = wk < 3 ? "off" : wk < 6 ? "pre" : "in";
        let asWeek = 0; let ltWeek = 0;
        for (let d = 0; d < 7; d++) {
          const date = add("2026-01-05", wk * 7 + d);
          const flag = date === FLAG ? [date] : []; // one arm flag in week 5
          const earn = earnStatus({ today: date, age, armFlagDates: date >= FLAG ? [FLAG] : [], redCheckinDates: [], armFeelGood: true, lastThrowingAnalysis: { date: add(date, -5), faultKeys: [] }, armRiskFindingDates: [], sessions, positionDistanceFt: positionDistance(sport, pos, age) });
          const day = catchPlayDay({ date, sport, position: pos, age, phase, isPitcher: pos === "P", pitcherRole: "starter", pitcherDay: d === 1 ? "bullpen" : d === 3 ? "long_toss" : d === 4 ? "start_in_2" : "other", restDay: d === 6, gameToday: false, gameYesterday: false, gameTomorrow: false, heavyYesterday: false, lowReadiness: false, trainingDayIndex: d, earn, progress: { greenWeeks: Math.max(0, wk - 1) } });
          for (const r of day.rows) expect(r.dosage).toMatch(/\d+ throws/);
          if (age < 13) {
            // Owner Nov 4: no under-13 stretch-out distance cap; throw counts stay capped.
            expect(total(day.rows.filter((r) => r.part === "pull_down"))).toBeLessThanOrEqual(5);
          }
          if (day.kind === "arm_strength") { asWeek++; expect(date >= FLAG && date < add(FLAG, 14)).toBe(false); }
          if (date >= FLAG && date < add(FLAG, 7)) expect(["arm_strength", "long_toss"]).not.toContain(day.kind);
          if (day.kind === "long_toss") ltWeek++;
          if (d === 6) expect(day.kind).toBe("none");
          if (day.rows.length) sessions.push({ date, maxDistanceFt: Math.max(...day.rows.map((r) => r.distanceFt)), painFree: !flag.length, armFeelGood: !flag.length });
        }
        expect(asWeek).toBeLessThanOrEqual(age < 13 || phase === "in" ? 1 : 2);
        if (pos !== "P") expect(asWeek + ltWeek).toBeLessThanOrEqual(S.longTossPerWeek[phase]);
      }
    });
  }
  it("a returning player walks up the build-up ladder to the position distance", () => {
    const sessions: CatchSession[] = [];
    const since = "2026-01-05";
    const steps: number[] = [];
    for (let d = 0; d < 20; d++) {
      const date = add(since, d);
      const ft = buildUpDistance("baseball", "OF", 25, sessions, since);
      steps.push(ft);
      sessions.push({ date, maxDistanceFt: ft, painFree: true, armFeelGood: true });
    }
    expect(steps[0]).toBe(45);
    expect(steps[steps.length - 1]).toBe(180);
    for (let i = 1; i < steps.length; i++) expect(steps[i] >= steps[i - 1]).toBe(true);
  });
});
