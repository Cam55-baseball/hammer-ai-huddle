import { describe, it, expect } from "vitest";
import {
  evaluateSignals, ALL_SIGNALS, SIGNAL_COPY, copyIsNeutral, type SignalSession, type SignalKey,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/silentSignals";
import { sessionsFromLogs, silentSignalEffect } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/silentSignalsApply";

const d = (i: number) => `2026-09-${String(10 + i).padStart(2, "0")}`;
const CASES: Record<SignalKey, SignalSession[]> = {
  under_target: [0, 1, 2].map((i) => ({ date: d(i), loggedLoad: 80, targetLoad: 100 })),
  over_target: [{ date: d(0), loggedLoad: 120, targetLoad: 100 }],
  rep_shortfall: [{ date: d(0), loggedLoad: 100, targetLoad: 100, repsCompleted: 3, repsPrescribed: 5 }],
  effort_mismatch: [{ date: d(0), loggedLoad: 100, targetLoad: 100, howHard: 9, repsCompleted: 5, repsPrescribed: 5 }],
  strength_dip: [0, 1, 2].map((i) => ({ date: d(i), estimatedMax: 90, estimatedMax28dBest: 100 })),
  avoidance: [0, 1].map((i) => ({ date: d(i), region: "shoulder", swapped: true })),
  side_to_side_gap: [{ date: d(0), leftResult: 100, rightResult: 80 }],
  skip_clustering: [0, 1].map((i) => ({ date: d(i), status: "skipped" as const, gameYesterday: true })),
  cut_short_rise: [0, 1, 2, 3, 4, 5].map((i) => ({ date: d(i), status: i >= 3 && i !== 4 ? ("cut_short" as const) : ("done" as const) })),
  check_in_mismatch: [0, 1, 2].map((i) => ({ date: d(i), checkInScore: 10, loggedLoad: 90, targetLoad: 100 })),
  test_drop: [{ date: d(0), testValue: 90, testBaseline: 100 }],
};

describe("Silent Signals — each of the eleven fires on its own synthetic case", () => {
  it("covers all eleven", () => expect(Object.keys(CASES).sort()).toEqual([...ALL_SIGNALS].sort()));
  for (const key of ALL_SIGNALS) {
    it(`${key} fires`, () => {
      expect(evaluateSignals(CASES[key]).map((s) => s.key)).toContain(key);
    });
  }
  it("all copy is neutral", () => {
    for (const k of ALL_SIGNALS) expect(copyIsNeutral(SIGNAL_COPY[k])).toBe(true);
  });
});

describe("Silent Signals — effect on today's session", () => {
  it("pain always wins", () => {
    expect(silentSignalEffect({ sessions: CASES.under_target, painActive: true }).reason).toBe("pain_wins");
  });
  it("a single noticed signal does not change the day", () => {
    const e = silentSignalEffect({ sessions: CASES.test_drop, painActive: false });
    expect(e.applied).toBe(false);
    expect(e.cnsCapDelta).toBe(0);
  });
  it("a repeated signal trims one CNS step, never removes, neutral copy", () => {
    const e = silentSignalEffect({ sessions: CASES.strength_dip, painActive: false });
    expect(e.applied).toBe(true);
    expect(e.cnsCapDelta).toBe(-1);
    expect(copyIsNeutral(e.copy!)).toBe(true);
  });
  it("adapter reads one-tap logs: repeated skips of one movement → avoidance", () => {
    const s = sessionsFromLogs([
      { plan_date: d(0), movement_slug: "trap_bar_deadlift", sets_completed: 0, metrics: { one_tap_outcome: "skipped" } },
      { plan_date: d(2), movement_slug: "trap_bar_deadlift", sets_completed: 0, metrics: { one_tap_outcome: "skipped" } },
      { plan_date: d(4), movement_slug: "trap_bar_deadlift", sets_completed: 0, metrics: { one_tap_outcome: "skipped" } },
    ]);
    const e = silentSignalEffect({ sessions: s, painActive: false });
    expect(e.signals).toContain("avoidance");
    expect(e.applied).toBe(true);
  });
  it("no logs → nothing changes", () => {
    expect(silentSignalEffect({ sessions: sessionsFromLogs([]), painActive: false }).applied).toBe(false);
  });
});
