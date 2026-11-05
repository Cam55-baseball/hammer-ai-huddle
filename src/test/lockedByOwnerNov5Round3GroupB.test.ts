/**
 * LOCKED BY OWNER — Nov 5 round 3, Group B: in-season conditioning for dense schedules.
 * Lock-in tests + 8-week simulations (MLB-style 6 games/week, college softball 4–5 with a
 * doubleheader, starter and bench, both sports).
 */
import { describe, it, expect } from "vitest";
import {
  gameCredit, dayCredit, isHeavyGame, inSeasonSprintDay, postGameTopup, countsAsRunningSession,
  TOPUP_MIN, TOPUP_MAX, SPEED_MIN, SPEED_MAX, WEEKLY_RUNNING_FLOOR, speedEligible, topupEligible,
  type GameCredit, type InSeasonDay,
} from "../../supabase/functions/_shared/wic/conditioning/inSeasonSprints.ts";

describe("game-load credit", () => {
  it("counts bases reached, bases advanced and defensive chances from the log", () => {
    const c = gameCredit({ date: "d", atBatResults: ["2B", "HR", "FO", "BB"], baserun: [{ event_type: "steal", base_from: 1, base_to: 2 }], defenseChances: 3, selfReportedAtBats: 9 });
    expect(c).toEqual({ date: "d", bases: 2 + 4 + 0 + 1 + 1 + 3, source: "log" });
  });
  it("caught stealing still ran one base", () => {
    expect(gameCredit({ date: "d", atBatResults: [], baserun: [{ event_type: "steal", base_from: null, base_to: null }], defenseChances: 0, selfReportedAtBats: null }).bases).toBe(1);
  });
  it("uses the morning at-bats answer only without a log, labeled an estimate", () => {
    expect(gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 0, selfReportedAtBats: 4 })).toEqual({ date: "d", bases: 4, source: "estimate" });
  });
  it("no log and no answer is unknown: no floor credit, treated as heavy for recovery", () => {
    const c = gameCredit({ date: "d", atBatResults: [], baserun: [], defenseChances: 0, selfReportedAtBats: null });
    expect(c.source).toBe("unknown");
    expect(c.bases).toBe(0);
    expect(isHeavyGame(c, 20)).toBe(true);
  });
  it("a doubleheader counts both games", () => {
    expect(dayCredit([{ date: "d", bases: 7, source: "log" }, { date: "d", bases: 5, source: "estimate" }], "d")).toEqual({ date: "d", bases: 12, source: "estimate" });
  });
});

describe("day types", () => {
  const base = { gameToday: false, gameTomorrow: false, yesterdayGame: null, hardYesterday: false, lowReadiness: false, weekBases: 0, weekRunningSessions: 0, speedDoneThisWeek: true, laterSpeedChances: 0, laterTopupChances: 0 };
  it("game day: no extra, flush after", () => {
    const d = inSeasonSprintDay(16, { ...base, gameToday: true });
    expect([d.kind, d.bases, d.flush]).toEqual(["game", 0, true]);
  });
  it("day after a heavy game (≥60% of capacity): flush only", () => {
    expect(inSeasonSprintDay(20, { ...base, yesterdayGame: { date: "y", bases: 12, source: "log" } }).kind).toBe("flush");
  });
  it("day after a light game: normal work allowed", () => {
    expect(inSeasonSprintDay(20, { ...base, yesterdayGame: { date: "y", bases: 2, source: "log" } }).kind).toBe("normal");
  });
  it("true off day, no game tomorrow: normal capacity", () => {
    const d = inSeasonSprintDay(14, base);
    expect([d.kind, d.bases]).toEqual(["normal", 14]);
  });
  it("day before a game is half only when the player did not play yesterday", () => {
    expect(inSeasonSprintDay(14, { ...base, gameTomorrow: true }).kind).toBe("pre_game_half");
    expect(inSeasonSprintDay(14, { ...base, gameTomorrow: true }).bases).toBe(7);
    expect(inSeasonSprintDay(14, { ...base, gameTomorrow: true, yesterdayGame: { date: "y", bases: 3, source: "log" } }).kind).toBe("none");
  });
  it("top-ups never before a game and never after a heavy game", () => {
    expect(topupEligible({ gameToday: false, gameTomorrow: true, yesterdayGame: null }, 20)).toBe(false);
    expect(topupEligible({ gameToday: false, gameTomorrow: false, yesterdayGame: { date: "y", bases: 15, source: "log" } }, 20)).toBe(false);
  });
  it("speed exposure is 3–6 max-intent bases and never the day after a hard day", () => {
    const d = inSeasonSprintDay(20, { ...base, speedDoneThisWeek: false });
    expect(d.kind).toBe("speed"); expect(d.maxIntent).toBe(true);
    expect(d.bases).toBeGreaterThanOrEqual(SPEED_MIN); expect(d.bases).toBeLessThanOrEqual(SPEED_MAX);
    expect(speedEligible({ ...base, hardYesterday: true }, 20)).toBe(false);
  });
  it("low readiness lightens", () => {
    expect(inSeasonSprintDay(20, { ...base, lowReadiness: true, weekRunningSessions: 2 }).bases).toBe(0);
    expect(inSeasonSprintDay(20, { ...base, lowReadiness: true }).bases).toBe(TOPUP_MIN);
  });
});

// ---------- 8-week simulations ----------
type Who = { capacity: number; gameBases: (dow: number, wk: number) => number };
/** dow 0=Mon..6=Sun; schedule: dow → games that day (2 = doubleheader). Sunday is the plan's rest day. */
function simulate(schedule: number[], who: Who, weeks = 8) {
  const out: { totals: number[]; sessions: number[]; speed: number[]; backToBackHard: number; days: InSeasonDay[][] } = { totals: [], sessions: [], speed: [], backToBackHard: 0, days: [] };
  let prevHard = false; let yesterday: GameCredit | null = null;
  for (let wk = 0; wk < weeks; wk++) {
    let weekBases = 0, sessions = 0, speed = 0; const days: InSeasonDay[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const games = schedule[dow];
      const gameTomorrow = schedule[(dow + 1) % 7] > 0;
      const isRest = dow === 6;
      const later = (pred: (i: number) => boolean) => [...Array(Math.max(0, 6 - dow - 1)).keys()].map((k) => dow + 1 + k).filter((i) => i < 6 && pred(i)).length;
      const laterSpeed = later((i) => schedule[i] === 0);
      const laterTop = later((i) => schedule[i] === 0 && schedule[i + 1] === 0);
      let planned = 0; let hard = false; let d: InSeasonDay = { kind: "none", bases: 0, maxIntent: false, flush: false, because: "" };
      if (!isRest || games > 0) {
        d = isRest ? { kind: "game", bases: 0, maxIntent: false, flush: true, because: "" } : inSeasonSprintDay(who.capacity, {
          gameToday: games > 0, gameTomorrow, yesterdayGame: yesterday, hardYesterday: prevHard, lowReadiness: false,
          weekBases, weekRunningSessions: sessions, speedDoneThisWeek: speed > 0, laterSpeedChances: laterSpeed, laterTopupChances: laterTop,
        });
        planned = d.bases;
        if (d.kind === "speed") { speed++; hard = true; }
        if (d.bases >= Math.ceil(who.capacity * 0.75)) hard = true;
      }
      let credit = 0;
      if (games > 0) {
        credit = [...Array(games).keys()].reduce((n) => n + who.gameBases(dow, wk), 0);
        const pg = postGameTopup(who.capacity, sessions);
        if (pg && credit < Math.ceil(who.capacity * 0.6) && !isRest) { planned += pg.bases; d = { ...d, kind: "topup", bases: pg.bases }; }
      }
      if (prevHard && hard) out.backToBackHard++;
      const dayTotal = planned + credit;
      weekBases += dayTotal;
      if (countsAsRunningSession(dayTotal)) sessions++;
      yesterday = games > 0 ? { date: String(dow), bases: credit, source: "log" } : null;
      prevHard = hard; days.push(d);
    }
    out.totals.push(weekBases); out.sessions.push(sessions); out.speed.push(speed); out.days.push(days);
  }
  return out;
}

const MLB = [0, 1, 1, 1, 1, 1, 1];          // Mon off, Tue–Sun games (6/week)
const SOFTBALL = [0, 1, 0, 2, 1, 0, 1];     // 5 games incl. a Thursday doubleheader
const SOFTBALL4 = [0, 1, 0, 1, 1, 0, 1];    // 4 games

const cases: [string, number[], Who][] = [
  ["baseball MLB-style starter", MLB, { capacity: 20, gameBases: () => 14 }],
  ["baseball MLB-style bench player", MLB, { capacity: 16, gameBases: () => 1 }],
  ["softball college starter (doubleheader)", SOFTBALL, { capacity: 18, gameBases: () => 10 }],
  ["softball college bench (doubleheader)", SOFTBALL, { capacity: 12, gameBases: () => 0 }],
  ["softball 4 games starter", SOFTBALL4, { capacity: 14, gameBases: () => 9 }],
  ["baseball 4 games bench", SOFTBALL4, { capacity: 10, gameBases: (d, w) => (w + d) % 3 }],
];

describe("8-week in-season simulations", () => {
  for (const [name, sched, who] of cases) {
    it(name, () => {
      const r = simulate(sched, who);
      // eslint-disable-next-line no-console
      console.log(`${name}: weekly bases ${r.totals.join("/")}, running sessions ${r.sessions.join("/")}, speed ${r.speed.join("/")}`);
      for (let w = 0; w < 8; w++) {
        expect(r.sessions[w]).toBeGreaterThanOrEqual(WEEKLY_RUNNING_FLOOR);
        // Owner question (Nov 5 r3 B): when every non-game day follows a heavy game, the locked
        // "flush only after a heavy game" rule wins and no speed day fits — never forced.
        if (who.gameBases(1, w) < Math.ceil(who.capacity * 0.6)) expect(r.speed[w]).toBe(1);
        else expect(r.speed[w]).toBeLessThanOrEqual(1);
        for (const d of r.days[w]) if (d.kind === "topup") { expect(d.bases).toBeGreaterThanOrEqual(TOPUP_MIN); expect(d.bases).toBeLessThanOrEqual(TOPUP_MAX); }
      }
      expect(r.backToBackHard).toBe(0);
    });
  }
});
