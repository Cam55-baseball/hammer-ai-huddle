import { describe, expect, it } from "vitest";
import { buildPitchingMicrocycle } from "../lib/hammer/pitching/pitchingMicrocycle";
import { DEFAULT_PITCHER_PROFILE } from "../lib/hammer/pitching/pitcherProfile";
import { buildShadowInputs, type RawShadowData } from "../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";

const outing = { id: "a", outing_type: "start" as const, planned_date: "2026-03-10", actual_date: "2026-03-11", status: "thrown" as const };
const settings = { role: "starter" as const, rotation_anchor_date: null, rotation_every_days: null, rotation_active: false };
const schedule = { settings, outings: [outing], availability: [] };
const input = {
  sport: "baseball" as const, rung: "foundation" as const,
  quarter: { phase: "in", quarter: 1, phaseKnown: true, quarterKnown: true, label: "In-season", accent: "Compete", headline: "", description: "", recoveryWindowMultiplier: 1, volumeCeilingMultiplier: 1 } as const,
  profile: { ...DEFAULT_PITCHER_PROFILE, isPitcher: true, role: "starter" as const },
  today: new Date(2026, 2, 12, 12), gameDows: [], preferredBullpenDow: null,
};
const raw = (extra: Partial<RawShadowData> = {}): RawShadowData => ({
  userId: "test", today: "2026-03-12", timezone: "UTC", windowStart: "2026-03-01", horizonEnd: "2026-03-26",
  mpi: null, context: null, prescriptions: [], sessionLogs: [], games: [], calendarEvents: [], practices: [], throwingReps: [], speedSessions: [], quizzes: [], dailyLogs: [], ...extra,
});

describe("pitcher schedule reaches existing load owners", () => {
  it("actual recovery wins even when another start is scheduled today", () => {
    const cycle = buildPitchingMicrocycle({ ...input, pitcherSchedule: { ...schedule, outings: [outing,
      { ...outing, id: "b", planned_date: "2026-03-12", actual_date: null, status: "planned" }] } });
    expect(cycle.today.dayType).toBe("flush");
  });
  it("relief evidence is exposed without inventing a position-game cost", () => {
    const load = buildShadowInputs(raw({ pitcherSchedule: { ...schedule, outings: [{ ...outing, outing_type: "relief" }] } }));
    expect(load.history.find((d) => d.date === outing.actual_date)?.games).toBeUndefined();
    expect(load.diagnostics).toContain("pitcher_relief_actual_2026-03-11_pitch_count_unknown");
  });
  it("actual Wednesday gives Thursday flush, never planned Tuesday", () => {
    const cycle = buildPitchingMicrocycle({ ...input, pitcherSchedule: schedule });
    expect(cycle.today.dayType).toBe("flush");
    expect(cycle.week).toHaveLength(7);
  });
  it("successful empty schedule retains the existing fallback", () => {
    expect(buildPitchingMicrocycle({ ...input, pitcherSchedule: { settings: null, outings: [], availability: [] } }))
      .toEqual(buildPitchingMicrocycle(input));
  });
  it("unconfirmed yesterday does not produce an actual-outing flush", () => {
    const cycle = buildPitchingMicrocycle({ ...input, pitcherSchedule: { settings, outings: [{ ...outing, planned_date: "2026-03-11", actual_date: null, status: "planned" }], availability: [] } });
    expect(cycle.today.dayType).not.toBe("flush");
  });
  it("availability is not a start or measured pitches", () => {
    const ps = { settings: { ...settings, role: "reliever" as const }, outings: [], availability: [{ date: "2026-03-12", available: true }] };
    expect(buildPitchingMicrocycle({ ...input, pitcherSchedule: ps }).today.dayType).toBe("available");
    const load = buildShadowInputs(raw({ pitcherSchedule: ps }));
    expect(load.history.some((d) => d.games || d.maxIntentThrows)).toBe(false);
    expect(load.diagnostics).toContain("reliever_available_2026-03-12_not_thrown");
  });
  it("weekly stress uses actual date and does not invent pitch counts or double-count a linked game", () => {
    const load = buildShadowInputs(raw({ pitcherSchedule: schedule, games: [{ game_date: "2026-03-11", is_starting_pitcher: true }] }));
    expect(load.history.find((d) => d.date === "2026-03-11")?.games?.count).toBe(1);
    expect(load.history.find((d) => d.date === "2026-03-11")?.pitcherStartDay).toBe(true);
    expect(load.history.find((d) => d.date === "2026-03-10")?.games).toBeUndefined();
    expect(load.history.find((d) => d.date === "2026-03-11")?.maxIntentThrows).toBeUndefined();
  });
  it("future start reserves competition load, not an actual history entry", () => {
    const load = buildShadowInputs(raw({ pitcherSchedule: { settings, outings: [{ ...outing, planned_date: "2026-03-14", actual_date: null, status: "planned" }], availability: [] } }));
    expect(load.calendar.find((d) => d.date === "2026-03-14")?.pitcherStartDay).toBe(true);
    expect(load.history.some((d) => d.date === "2026-03-14")).toBe(false);
  });
  it("read failure has a distinct diagnostic, not a no-schedule claim", () => {
    const load = buildShadowInputs(raw({ pitcherScheduleError: true }));
    expect(load.diagnostics).toContain("pitcher_schedule_read_failed");
    expect(load.diagnostics).not.toContain("no_pitcher_schedule");
  });
  it("softball keeps its sport-specific cycle while honoring real outing recovery", () => {
    const cycle = buildPitchingMicrocycle({ ...input, sport: "softball", pitcherSchedule: schedule });
    expect(cycle.today.dayType).toBe("flush");
    expect(cycle.weekLabel).toContain("Softball");
  });
});