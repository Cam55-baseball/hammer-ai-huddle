import { describe, it, expect } from "vitest";
import { buildShadowInputs, type RawQuiz, type RawDailyLog } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { PLAN_RULES_VERSION } from "../../../supabase/functions/_shared/planRulesVersion";
import { deriveRecoveryContext, mergeDayCheckIns } from "@/hooks/useWorkoutRecommendations";

const DAY = "2026-03-09";

function dayCheckIn(quizzes: RawQuiz[], dailyLogs: RawDailyLog[] = []) {
  const raw: any = {
    userId: "00000000-0000-0000-0000-000000000001",
    today: "2026-03-10", timezone: "UTC", windowStart: "2026-01-09", horizonEnd: "2026-03-24",
    mpi: null, context: null, prescriptions: [], sessionLogs: [], games: [], calendarEvents: [],
    practices: [], throwingReps: [], speedSessions: [], quizzes, dailyLogs,
  };
  return buildShadowInputs(raw).checkIns.find((c) => c.date === DAY) ?? null;
}

const morning: RawQuiz = { entry_date: DAY, hours_slept: 8, sleep_quality: 4, perceived_recovery: 7, pain_location: null, pain_scale: null, created_at: "2026-03-09T07:00:00Z" };
const preLift: RawQuiz = { entry_date: DAY, pain_location: ["shoulder"], pain_scale: 7, created_at: "2026-03-09T15:00:00Z" };
const night: RawQuiz = { entry_date: DAY, pain_location: [], pain_scale: null, created_at: "2026-03-09T21:00:00Z" };

const orders = [
  [morning, preLift, night], [morning, night, preLift], [preLift, morning, night],
  [preLift, night, morning], [night, morning, preLift], [night, preLift, morning],
];

describe("Owner Nov 10 — planner: any pain reported that day always counts", () => {
  it.each(orders.map((o, i) => [i, o] as const))("morning + pre_lift (shoulder 7) + night, order %i: shoulder kept, loaded work blocked", (_i, rows) => {
    expect(dayCheckIn([...rows]).pain).toEqual([{ region: "shoulder", tank: null, blocksLoadedWork: true }]);
  });

  it("the same region at scale 3 and 7 on one day uses 7", () => {
    const low: RawQuiz = { entry_date: DAY, pain_location: ["shoulder"], pain_scale: 3 };
    const high: RawQuiz = { entry_date: DAY, pain_location: ["shoulder"], pain_scale: 7 };
    expect(dayCheckIn([high, low]).pain).toEqual([{ region: "shoulder", tank: null, blocksLoadedWork: true }]);
    expect(dayCheckIn([low, high]).pain).toEqual([{ region: "shoulder", tank: null, blocksLoadedWork: true }]);
  });

  it("scale 5 alone does not block loaded work (6 or higher still the rule)", () => {
    expect(dayCheckIn([{ entry_date: DAY, pain_location: ["knee"], pain_scale: 5 }]).pain)
      .toEqual([{ region: "knee", tank: null, blocksLoadedWork: false }]);
  });

  it("pain in a check-in plus a daily-log injury keeps both", () => {
    const c = dayCheckIn([preLift, night], [{ entry_date: DAY, injury_mode: true, injury_body_region: "hamstring" }]);
    expect(c?.pain).toEqual([
      { region: "shoulder", tank: null, blocksLoadedWork: true },
      { region: "hamstring", tank: null, blocksLoadedWork: true },
    ]);
  });

  it("no pain anywhere gives none", () => {
    expect(dayCheckIn([morning, night]).pain).toBeNull();
  });

  it("the rules version is bumped so saved future days refresh", () => {
    expect(PLAN_RULES_VERSION).toBe(13);
  });
});

describe("Owner Nov 10 — AI workout suggestions read the whole latest check-in day", () => {
  it("morning (recovery 3) then a blank night row still warns", () => {
    const ctx = deriveRecoveryContext(mergeDayCheckIns([
      { sleep_quality: 4, physical_readiness: 4, perceived_recovery: 3, pain_location: [], created_at: "2026-03-09T07:00:00Z" },
      { sleep_quality: null, physical_readiness: null, perceived_recovery: null, pain_location: null, created_at: "2026-03-09T21:00:00Z" },
    ]));
    expect(ctx.perceivedRecovery).toBe(3);
    expect(ctx.suggestRecovery).toBe(true);
  });

  it("pre_lift pain then a night row still lists the pain", () => {
    const ctx = deriveRecoveryContext(mergeDayCheckIns([
      { pain_location: ["shoulder"], pain_scales: { shoulder: 7 }, created_at: "2026-03-09T15:00:00Z" },
      { pain_location: [], pain_scales: null, created_at: "2026-03-09T21:00:00Z" },
    ]));
    expect(ctx.painAreas).toEqual(["shoulder"]);
    expect(ctx.painScales).toEqual({ shoulder: 7 });
  });

  it("a repeated area keeps the higher scale; the most recent real answer wins", () => {
    const m = mergeDayCheckIns([
      { perceived_recovery: 8, pain_location: ["elbow"], pain_scales: { elbow: 3 }, created_at: "2026-03-09T07:00:00Z" },
      { perceived_recovery: 4, pain_location: ["elbow"], pain_scales: { elbow: 6 }, created_at: "2026-03-09T15:00:00Z" },
    ]);
    expect(m.perceived_recovery).toBe(4);
    expect(m.pain_scales).toEqual({ elbow: 6 });
  });
});
