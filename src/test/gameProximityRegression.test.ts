/**
 * Regression tests for the four schedule bugs that reached real athletes.
 *
 * Each of these cost someone training. They must not be able to come back
 * quietly.
 *
 *   1. Forward-only window — a game already played suppressed the next two days.
 *   2. Finished games — a logged, finished game punished the athlete for logging it.
 *   3. De-duplication — one game entered on two surfaces looked like a doubleheader.
 *   4. Zero-exposure invariant — a dense week could leave a pro with no lifting at all.
 */
import { describe, it, expect } from "vitest";
import {
  resolveGameProximity,
  dedupeGames,
  type ScheduledGame,
} from "../../supabase/functions/_shared/wic/schedule/gameProximity.ts";

const g = (o: Partial<ScheduledGame> & { date: string }): ScheduledGame =>
  ({ source: "gp_games", ...o }) as ScheduledGame;

function addDays(d: string, n: number): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

describe("bug 1 — forward-only window", () => {
  it("a game yesterday changes nothing today", () => {
    const r = resolveGameProximity([g({ date: "2026-09-04" })], "2026-09-05");
    expect(r.primerOnly).toBe(false);
    expect(r.removeLift).toBe(false);
    expect(r.within48h).toBe(false);
    expect(r.hoursToNearestGame).toBeNull();
  });

  it("a game tomorrow still restricts today", () => {
    const r = resolveGameProximity([g({ date: "2026-09-06", time: "18:00" })], "2026-09-05");
    expect(r.primerOnly).toBe(true);
    expect(r.within48h).toBe(true);
  });
});

describe("bug 2 — finished games leave the rule", () => {
  it("the real Sep 4 finished rows do not touch the Sep 5 plan", () => {
    const r = resolveGameProximity(
      [
        g({ id: "3be75dc4", date: "2026-09-04", status: "final" }),
        g({ id: "93bde4db", date: "2026-09-04", status: "final" }),
      ],
      "2026-09-05",
    );
    expect(r.finishedExcluded).toBe(2);
    expect(r.primerOnly).toBe(false);
    expect(r.cnsCapDelta).toBe(0);
  });

  it("a game finished earlier today does not remove tonight's lift", () => {
    const r = resolveGameProximity(
      [g({ date: "2026-09-05", status: "final", isStartingPitcher: true })],
      "2026-09-05",
    );
    expect(r.removeLift).toBe(false);
  });
});

describe("bug 3 — de-duplication across surfaces", () => {
  it("the same game on both surfaces is one game", () => {
    const res = dedupeGames(
      [
        g({ id: "a", date: "2026-09-10", time: "18:00", source: "gp_games" }),
        g({ id: "b", date: "2026-09-10", time: null, source: "calendar_events" }),
      ],
      "2026-09-09",
    );
    expect(res.games).toHaveLength(1);
    expect(res.duplicatesCollapsed).toBe(1);
  });

  it("a declared doubleheader still counts as two", () => {
    const res = dedupeGames(
      [
        g({ id: "a", date: "2026-09-10", time: "13:00", declaredDoubleheader: true }),
        g({ id: "b", date: "2026-09-10", time: "16:00", declaredDoubleheader: true }),
      ],
      "2026-09-10",
    );
    expect(res.games).toHaveLength(2);
    expect(res.duplicatesCollapsed).toBe(0);
    const r = resolveGameProximity(res.games, "2026-09-10");
    expect(r.isDoubleheaderToday).toBe(true);
    expect(r.cnsCapDelta).toBe(-1);
  });

  it("two undeclared rows on one date never invent a doubleheader", () => {
    const r = resolveGameProximity(
      [
        g({ id: "a", date: "2026-09-10", time: "18:00" }),
        g({ id: "b", date: "2026-09-10", time: null, source: "calendar_events" }),
      ],
      "2026-09-10",
    );
    expect(r.gamesToday).toBe(1);
    expect(r.isDoubleheaderToday).toBe(false);
    expect(r.cnsCapDelta).toBe(0);
  });
});

describe("bug 4 — zero-exposure invariant", () => {
  const week = Array.from({ length: 7 }, (_, i) =>
    g({ id: `w${i}`, date: addDays("2026-09-07", i), time: "18:00" }),
  );

  it("seven games in seven days never leaves a day with nothing", () => {
    for (let i = 0; i < 7; i++) {
      const day = addDays("2026-09-07", i);
      const r = resolveGameProximity(week, day, { liftExposureDatesLast7: [] });
      expect(r.removeLift, `${day} removed the lift entirely`).toBe(false);
      expect(r.primerOnly, `${day} lost its primer`).toBe(true);
      expect(r.highDensity).toBe(true);
    }
  });

  it("a declared start with no lift in seven days relaxes to a primer", () => {
    const r = resolveGameProximity(
      [g({ date: "2026-09-07", time: "18:00", isStartingPitcher: true })],
      "2026-09-07",
      { isPitcher: true, liftExposureDatesLast7: [] },
    );
    expect(r.removeLift).toBe(false);
    expect(r.zeroExposureRelief).toBe(true);
    expect(r.primerOnly).toBe(true);
  });

  it("a declared start with recent exposure still removes the lift", () => {
    const r = resolveGameProximity(
      [g({ date: "2026-09-07", time: "18:00", isStartingPitcher: true })],
      "2026-09-07",
      { isPitcher: true, liftExposureDatesLast7: ["2026-09-04"] },
    );
    expect(r.removeLift).toBe(true);
    expect(r.zeroExposureRelief).toBe(false);
  });

  it("a genuine off day inside a dense week gets a full session", () => {
    const dense = ["2026-09-07", "2026-09-09", "2026-09-11", "2026-09-12"].map((d, i) =>
      g({ id: `d${i}`, date: d, time: "18:00" }),
    );
    const off = resolveGameProximity(dense, "2026-09-10", { liftExposureDatesLast7: [] });
    expect(off.highDensity).toBe(true);
    expect(off.primerOnly).toBe(false);
    expect(off.removeLift).toBe(false);
  });
});
