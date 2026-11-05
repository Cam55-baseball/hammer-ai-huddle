/**
 * LOCKED BY OWNER — Nov 5 (final): in-season conditioning.
 * No sprints after a game; extra short pre-game speed session for players not getting playing
 * time; the body decides; defense never counts; no stacked flush jogs; settings removed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  gameCredit, inSeasonSprintDay, countsAsRunningSession, isLowPlayingTime, inSeasonStandards,
  DEFAULT_IN_SEASON_STANDARDS as D, WEEKLY_RUNNING_FLOOR, MAX_SPRINT_KINDS, ADDS_ROW_KINDS,
  type GameCredit, type InSeasonDay,
} from "../../supabase/functions/_shared/wic/conditioning/inSeasonSprints.ts";
import * as mod from "../../supabase/functions/_shared/wic/conditioning/inSeasonSprints.ts";

const base = { gameToday: false, gameTomorrow: false, yesterdayGame: null, hardYesterday: false, lowReadiness: false, weekBases: 0, weekRunningSessions: 0, speedDoneThisWeek: true, laterSpeedChances: 0, laterTopupChances: 0 };
const benchGame: GameCredit = { date: "y", bases: 0, source: "log" };

describe("1 — never any sprints after a game", () => {
  it("game day has no sprints, no top-up and no flush jog", () => {
    const d = inSeasonSprintDay(18, { ...base, gameToday: true });
    expect([d.kind, d.bases, d.maxIntent, d.flush]).toEqual(["game", 0, false, false]);
  });
  it("the post-game top-up is gone from the rules", () => {
    expect((mod as any).postGameTopup).toBeUndefined();
  });
  it("the generator removes every game-day sprint/flush row except the pre-game extra session", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toContain('if (inSeasonDay.gameToday || inSeasonDay.kind === "pain_no_sprints")');
    expect(src).not.toContain("post_game_topup");
    expect(readFileSync("supabase/functions/wk-generate-daily/inSeasonFacts.ts", "utf8")).not.toContain("postGameTopup(");
  });
});

describe("2/3 — extra short speed session for players not getting playing time", () => {
  it("next game day: 4 all-out sprints as pre-game early work, with sprint prep", () => {
    const d = inSeasonSprintDay(18, { ...base, gameToday: true, pendingGame: benchGame });
    expect([d.kind, d.bases, d.maxIntent, d.sprintPrep, d.preGame]).toEqual(["extra_speed_pre_game", 4, true, true, true]);
    expect(d.because).toMatch(/before game time/);
  });
  it("next off day: the extra session runs that day", () => {
    expect(inSeasonSprintDay(18, { ...base, pendingGame: { date: "y", bases: 1, source: "estimate" } }).kind).toBe("extra_speed");
  });
  it("low readiness shortens to 3; very low readiness skips; never right after another all-out day", () => {
    expect(inSeasonSprintDay(18, { ...base, gameToday: true, pendingGame: benchGame, lowReadiness: true }).bases).toBe(3);
    expect(inSeasonSprintDay(18, { ...base, gameToday: true, pendingGame: benchGame, veryLowReadiness: true }).kind).toBe("game");
    expect(inSeasonSprintDay(18, { ...base, gameToday: true, pendingGame: benchGame, hardYesterday: true }).kind).toBe("game");
  });
  it("a leg pain flag removes sprints", () => {
    expect(inSeasonSprintDay(18, { ...base, pendingGame: benchGame, legPain: true }).bases).toBe(0);
    expect(inSeasonSprintDay(18, { ...base, gameToday: true, pendingGame: benchGame, legPain: true }).bases).toBe(0);
  });
  it("starters (real playing time) and unlogged games do not trigger it", () => {
    expect(isLowPlayingTime({ date: "y", bases: 9, source: "log" })).toBe(false);
    expect(isLowPlayingTime({ date: "y", bases: 0, source: "unknown" })).toBe(false);
  });
  it("only extra sessions and existing kinds add a base-sprint row", () => {
    expect(ADDS_ROW_KINDS.has("extra_speed_pre_game")).toBe(true);
    expect(MAX_SPRINT_KINDS.has("extra_speed")).toBe(true);
  });
});

describe("4/5 — defense does not count; at-bat default and heavy game kept", () => {
  it("fielding chances add nothing", () => {
    const c = gameCredit({ date: "d", atBatResults: ["1B"], baserun: [], defenseChances: 9, selfReportedAtBats: null });
    expect(c.bases).toBe(1);
  });
  it("1 base per at-bat until 15 logged; heavy = 60%", () => {
    expect([D.basesPerPaDefault, D.ownAverageMinPa, D.heavyGameShare]).toEqual([1, 15, 0.6]);
  });
});

describe("6 — consecutive game days and the day after a heavy game", () => {
  it("heavy game then a game: nothing extra; heavy game then off day: light recovery only", () => {
    const heavy = { date: "y", bases: 14, source: "log" as const };
    expect(inSeasonSprintDay(18, { ...base, gameToday: true, yesterdayGame: heavy, pendingGame: heavy })).toMatchObject({ kind: "game", bases: 0, flush: false });
    expect(inSeasonSprintDay(18, { ...base, yesterdayGame: heavy, pendingGame: heavy })).toMatchObject({ kind: "flush", bases: 0, maxIntent: false });
  });
});

describe("7 — Coaching Console", () => {
  it("fielding-credit settings are gone; remaining ones stay editable", () => {
    const src = readFileSync("src/components/intelligence/ConditioningSettings.tsx", "utf8");
    expect(src).not.toMatch(/chanceOutfield|fielding chance/);
    expect(src).toContain("lowPlayMaxBases");
    expect(Object.keys(inSeasonStandards(null))).not.toContain("chanceOutfield");
  });
});

// ---------- 8-week simulations ----------
type Who = { capacity: number; gameBases: (dow: number, wk: number) => number };
function simulate(schedule: number[], who: Who) {
  const res = { sessions: [] as number[], postGameSprints: 0, gameDayFlush: 0, backToBack: 0, extraPre: 0, days: [] as InSeasonDay[] };
  let prevHard = false, yesterday: GameCredit | null = null, pending: GameCredit | null = null;
  for (let wk = 0; wk < 8; wk++) {
    let sessions = 0, weekBases = 0, speedDone = false;
    for (let dow = 0; dow < 7; dow++) {
      const games = schedule[dow];
      const restDay = dow === 6 && games === 0;
      const d: InSeasonDay = restDay ? { kind: "none", bases: 0, maxIntent: false, flush: false, because: "" } : inSeasonSprintDay(who.capacity, {
        gameToday: games > 0, gameTomorrow: schedule[(dow + 1) % 7] > 0, yesterdayGame: yesterday, hardYesterday: prevHard,
        lowReadiness: false, weekBases, weekRunningSessions: sessions, speedDoneThisWeek: speedDone,
        laterSpeedChances: 0, laterTopupChances: 0, pendingGame: pending,
      });
      const hard = MAX_SPRINT_KINDS.has(d.kind);
      if (hard && prevHard) res.backToBack++;
      if (hard) { speedDone = true; pending = null; }
      if (games > 0) {
        if (d.bases > 0 && !d.preGame) res.postGameSprints++;
        if (d.flush) res.gameDayFlush++;
        if (d.kind === "extra_speed_pre_game") res.extraPre++;
      }
      const credit = games > 0 ? games * who.gameBases(dow, wk) : 0;
      const total = d.bases + credit;
      weekBases += total;
      if (countsAsRunningSession(total)) sessions++;
      if (games > 0) { yesterday = { date: String(dow), bases: credit, source: "log" }; pending = yesterday; } else yesterday = null;
      prevHard = hard; res.days.push(d);
    }
    res.sessions.push(sessions);
  }
  return res;
}
const MLB = [1, 1, 1, 1, 1, 1, 0];          // 6 games a week, Sunday rest
const COLLEGE_SB = [0, 1, 1, 0, 2, 1, 0];   // midweek games + Friday doubleheader
const cases: [string, number[], Who, boolean][] = [
  ["baseball MLB-style 6-game starter", MLB, { capacity: 20, gameBases: () => 6 }, false],
  ["softball MLB-style 6-game starter", MLB, { capacity: 16, gameBases: () => 5 }, false],
  ["baseball bench player who rarely plays", MLB, { capacity: 18, gameBases: (d, w) => ((d + w) % 5 === 0 ? 4 : 0) }, true],
  ["softball bench player who rarely plays", MLB, { capacity: 14, gameBases: () => 0 }, true],
  ["college softball with a doubleheader (starter)", COLLEGE_SB, { capacity: 14, gameBases: () => 5 }, false],
  ["college baseball with a doubleheader (bench)", COLLEGE_SB, { capacity: 16, gameBases: () => 1 }, true],
];
describe("8-week simulations (locked by owner Nov 5)", () => {
  for (const [name, sched, who, bench] of cases) it(name, () => {
    const r = simulate(sched, who);
    // eslint-disable-next-line no-console
    console.log(`${name}: running sessions ${r.sessions.join("/")}, pre-game extra sessions ${r.extraPre}`);
    expect(r.postGameSprints).toBe(0);
    expect(r.gameDayFlush).toBe(0);
    expect(r.backToBack).toBe(0);
    for (const s of r.sessions) expect(s).toBeGreaterThanOrEqual(WEEKLY_RUNNING_FLOOR);
    if (bench) expect(r.extraPre).toBeGreaterThan(0);
  });
});
