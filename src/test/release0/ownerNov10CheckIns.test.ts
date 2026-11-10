import { describe, it, expect } from "vitest";
import { buildShadowInputs, type RawQuiz } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { PLAN_RULES_VERSION } from "../../../supabase/functions/_shared/planRulesVersion";

const DAY = "2026-03-09";

function checkInFor(quizzes: RawQuiz[]) {
  const raw: any = {
    userId: "00000000-0000-0000-0000-000000000001",
    today: "2026-03-10",
    timezone: "UTC",
    windowStart: "2026-01-09",
    horizonEnd: "2026-03-24",
    mpi: null,
    context: null,
    prescriptions: [],
    sessionLogs: [],
    games: [],
    calendarEvents: [],
    practices: [],
    throwingReps: [],
    speedSessions: [],
    quizzes,
    dailyLogs: [],
  };
  const out = buildShadowInputs(raw).checkIns.filter((c) => c.date === DAY);
  expect(out).toHaveLength(1);
  return out[0];
}

// pre_lift / night rows never carry sleep or recovery (blank by design).
const nightRow: RawQuiz = { entry_date: DAY, hours_slept: null, sleep_quality: null, perceived_recovery: null, pain_location: null };
const preLiftRow: RawQuiz = { entry_date: DAY, hours_slept: null, sleep_quality: null, perceived_recovery: null, pain_location: null };
const morningRow: RawQuiz = { entry_date: DAY, hours_slept: 5, sleep_quality: 4, perceived_recovery: 3 };

describe("Owner Nov 10 — blank sleep is unknown, never 0", () => {
  it("blank hours slept is not poor sleep", () => {
    expect(checkInFor([{ entry_date: DAY, hours_slept: null, sleep_quality: 4 }]).poorSleep).toBe(false);
  });

  it("blank sleep quality is not poor sleep", () => {
    expect(checkInFor([{ entry_date: DAY, hours_slept: 8, sleep_quality: null }]).poorSleep).toBe(false);
  });

  it("both blank: sleep is unknown", () => {
    expect(checkInFor([{ entry_date: DAY, hours_slept: null, sleep_quality: null }]).poorSleep).toBeNull();
  });

  it("5 hours slept is poor sleep", () => {
    expect(checkInFor([{ entry_date: DAY, hours_slept: 5, sleep_quality: 4 }]).poorSleep).toBe(true);
  });

  it("sleep quality 2 is poor sleep", () => {
    expect(checkInFor([{ entry_date: DAY, hours_slept: 8, sleep_quality: 2 }]).poorSleep).toBe(true);
  });
});

describe("Owner Nov 10 — a day's check-ins never erase each other's sleep or recovery", () => {
  it("morning (recovery 3, hours 5) then a blank night row: still high soreness and poor sleep", () => {
    expect(checkInFor([morningRow, nightRow])).toMatchObject({ poorSleep: true, highSoreness: true });
  });

  it("a blank pre_lift row then the morning row: the same answer", () => {
    expect(checkInFor([preLiftRow, morningRow])).toMatchObject({ poorSleep: true, highSoreness: true });
  });

  it("a day with only a night row: sleep and recovery are unknown", () => {
    const c = checkInFor([nightRow]);
    expect(c.poorSleep).toBeNull();
    expect(c.highSoreness).toBeNull();
  });

  it("two real answers for the same field: the most recent one wins", () => {
    const c = checkInFor([
      { entry_date: DAY, perceived_recovery: 3, created_at: "2026-03-09T18:00:00Z" },
      { entry_date: DAY, perceived_recovery: 8, created_at: "2026-03-09T07:00:00Z" },
    ]);
    expect(c.highSoreness).toBe(true);
  });

  it("pain from any row that day is kept (superseded Nov 10: pain always counts)", () => {
    const pain: RawQuiz = { entry_date: DAY, pain_location: ["shoulder"], pain_scale: 3 };
    expect(checkInFor([morningRow, pain]).pain).toEqual([{ region: "shoulder", tank: null, blocksLoadedWork: false }]);
    expect(checkInFor([pain, nightRow]).pain).toEqual([{ region: "shoulder", tank: null, blocksLoadedWork: false }]);
  });

  it("the rules version is bumped so saved future days refresh", () => {
    expect(PLAN_RULES_VERSION).toBeGreaterThanOrEqual(12);
  });
});
