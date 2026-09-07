/**
 * Game-day override — what it lifts, and everything it must never lift.
 *
 * The override exists so an athlete can say "the game is real and I want to
 * lift anyway". It relaxes schedule-derived caps only. These tests are the
 * proof that nothing else moves with it.
 */
import { describe, expect, it } from "vitest";
import {
  resolveGameProximity,
  type ScheduledGame,
} from "../../supabase/functions/_shared/wic/schedule/gameProximity.ts";

const PLAN = "2026-09-11"; // Friday
const NEXT = "2026-09-12";

function game(partial: Partial<ScheduledGame> = {}): ScheduledGame {
  return {
    id: "g1",
    date: PLAN,
    time: "18:00",
    source: "gp_games",
    label: "vs Riverside",
    ...partial,
  };
}

describe("lift-anyway override — what it lifts", () => {
  it("48-hour primer cap comes off with the override, and only with it", () => {
    const games = [game({ date: NEXT })];
    const before = resolveGameProximity(games, PLAN, {});
    const after = resolveGameProximity(games, PLAN, { athleteOverride: true });

    expect(before.primerOnly).toBe(true);
    expect(before.overrideAvailable).toBe(true);
    expect(before.overrideApplied).toBe(false);

    expect(after.primerOnly).toBe(false);
    expect(after.overrideApplied).toBe(true);
    expect(after.headline).toBe("You chose to lift through today's game day.");
  });

  it("game-day primer under high density comes off too", () => {
    const games: ScheduledGame[] = [
      game({ id: "a", date: PLAN }),
      game({ id: "b", date: "2026-09-12" }),
      game({ id: "c", date: "2026-09-13" }),
      game({ id: "d", date: "2026-09-10" }),
      game({ id: "e", date: "2026-09-09" }),
    ];
    const before = resolveGameProximity(games, PLAN, {});
    const after = resolveGameProximity(games, PLAN, { athleteOverride: true });
    expect(before.highDensity).toBe(true);
    expect(before.primerOnly).toBe(true);
    expect(after.primerOnly).toBe(false);
    expect(after.overrideApplied).toBe(true);
  });
});

describe("lift-anyway override — what it must never lift", () => {
  it("the CNS cap pull-back for a declared doubleheader survives", () => {
    const games: ScheduledGame[] = [
      game({ id: "a", date: PLAN, time: "13:00", declaredDoubleheader: true }),
      game({ id: "b", date: PLAN, time: "16:00", declaredDoubleheader: true }),
    ];
    const after = resolveGameProximity(games, PLAN, { athleteOverride: true });
    expect(after.cnsCapDelta).toBe(-1);
  });

  it("a declared start today keeps the lift off", () => {
    const games = [game({ isStartingPitcher: true })];
    const after = resolveGameProximity(games, PLAN, {
      athleteOverride: true,
      liftExposureDatesLast7: ["2026-09-09"],
    });
    expect(after.removeLift).toBe(true);
    expect(after.overrideApplied).toBe(false);
    expect(after.overrideAvailable).toBe(false);
  });

  it("a declared start tomorrow keeps the day-before primer", () => {
    const games = [game({ date: NEXT, isStartingPitcher: true })];
    const after = resolveGameProximity(games, PLAN, { athleteOverride: true });
    expect(after.primerOnly).toBe(true);
    expect(after.overrideApplied).toBe(false);
    expect(after.overrideAvailable).toBe(false);
  });

  it("an override on another date does not reach this plan date", () => {
    // The override is read per plan date; this function is told about the
    // athlete's choice for THIS date only. With no game in range there is
    // nothing to relax and nothing is claimed.
    const games = [game({ date: "2026-09-20" })];
    const after = resolveGameProximity(games, PLAN, { athleteOverride: true });
    expect(after.overrideApplied).toBe(false);
    expect(after.primerOnly).toBe(false);
  });

  it("the override never invents a relaxation when nothing was restricted", () => {
    const after = resolveGameProximity([], PLAN, { athleteOverride: true });
    expect(after.overrideApplied).toBe(false);
    expect(after.overrideAvailable).toBe(false);
  });
});
