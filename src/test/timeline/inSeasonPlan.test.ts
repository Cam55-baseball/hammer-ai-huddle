import { describe, expect, it } from "vitest";
import {
  IN_SEASON_LIMITS,
  LIFT_A_ROLES,
  LIFT_B_ROLES,
  MAX_VELOCITY_OFFER,
  PRE_GAME_PRIMER,
  resolveInSeasonPlan,
  type InSeasonPlanInput,
} from "../../../supabase/functions/_shared/wic/schedule/inSeasonPlan.ts";

const base: InSeasonPlanInput = {
  phase: "in_season",
  planDate: "2026-04-06",
  isGameDay: true,
  gameRole: "position",
};

describe("in-season post-game plan — §9", () => {
  it("stays out of the way outside the season", () => {
    const got = resolveInSeasonPlan({ ...base, phase: "os_q1" });
    expect(got.applies).toBe(false);
    expect(got.roles).toHaveLength(0);
  });

  it("always lifts after the game, never before", () => {
    const game = resolveInSeasonPlan(base);
    expect(game.timing).toBe("post_game");
    expect(game.timingNote).toBe("Do this after the game.");
    const nonGame = resolveInSeasonPlan({ ...base, isGameDay: false });
    expect(nonGame.timing).toBe("after_skill_work");
    expect(nonGame.timingNote).toBe("Do this after your skill work.");
  });

  it("keeps each lift to 4 movements plus arm care and 25 minutes", () => {
    expect(IN_SEASON_LIMITS.maxMinutes).toBe(25);
    expect(IN_SEASON_LIMITS.minRir).toBe(3);
    expect(IN_SEASON_LIMITS.eccentricOverload).toBe(false);
    expect(IN_SEASON_LIMITS.novelty).toBe(false);
    for (const roles of [LIFT_A_ROLES, LIFT_B_ROLES]) {
      expect(roles).toHaveLength(4);
      expect(roles[roles.length - 1].role).toContain("arm_care");
      expect(roles.some((r) => r.method === "double_eccentric")).toBe(false);
    }
  });

  it("alternates A and B off the last completed lift", () => {
    expect(resolveInSeasonPlan({ ...base, lastLiftSlot: "A" }).slot).toBe("B");
    expect(resolveInSeasonPlan({ ...base, lastLiftSlot: "B" }).slot).toBe("A");
    expect(resolveInSeasonPlan({ ...base, lastLiftSlot: null }).slot).toBe("A");
  });

  it("runs the pre-game primer on every game day except a starter on start day", () => {
    expect(resolveInSeasonPlan(base).preGamePrimer).toBe(true);
    expect(
      resolveInSeasonPlan({ ...base, gameRole: "starting_pitcher", startsToday: true }).preGamePrimer,
    ).toBe(false);
    expect(
      resolveInSeasonPlan({ ...base, gameRole: "starting_pitcher", startsTomorrow: true })
        .preGamePrimer,
    ).toBe(true);
    expect(PRE_GAME_PRIMER.maxMinutes).toBe(10);
    expect(PRE_GAME_PRIMER.jumpTier).toBe(1);
    expect(PRE_GAME_PRIMER.intensityClass).toBe("elastic");
  });

  it("protects the starting pitcher's start and the day before", () => {
    const startDay = resolveInSeasonPlan({
      ...base,
      gameRole: "starting_pitcher",
      startsToday: true,
    });
    expect(startDay.liftAllowed).toBe(false);
    const dayBefore = resolveInSeasonPlan({
      ...base,
      gameRole: "starting_pitcher",
      startsTomorrow: true,
      isGameDay: false,
    });
    expect(dayBefore.liftAllowed).toBe(false);
    expect(dayBefore.primerOnly).toBe(true);
  });

  it("puts a starter on A the day after a start and B two days later", () => {
    expect(
      resolveInSeasonPlan({ ...base, gameRole: "starting_pitcher", isGameDay: false, daysSinceStart: 1 })
        .slot,
    ).toBe("A");
    expect(
      resolveInSeasonPlan({ ...base, gameRole: "starting_pitcher", isGameDay: false, daysSinceStart: 3 })
        .slot,
    ).toBe("B");
  });

  it("gives a reliever who threw today the B roles only", () => {
    const got = resolveInSeasonPlan({
      ...base,
      gameRole: "reliever",
      pitchedInReliefToday: true,
      lastLiftSlot: "B",
    });
    expect(got.slot).toBe("B");
  });

  it("keeps catchers out of a deep squat", () => {
    expect(resolveInSeasonPlan({ ...base, gameRole: "catcher" }).lowerPattern).toBe(
      "hinge_or_trap_bar",
    );
  });

  it("drops the lift on tournament and doubleheader days", () => {
    expect(resolveInSeasonPlan({ ...base, tournamentToday: true }).liftAllowed).toBe(false);
    expect(resolveInSeasonPlan({ ...base, doubleheaderToday: true }).liftAllowed).toBe(false);
  });

  it("offers the weekly max-velocity touch, never in a dense week or on a game day", () => {
    expect(
      resolveInSeasonPlan({ ...base, isGameDay: false, daysSinceMaxVelocity: 9 }).offerMaxVelocity,
    ).toBe(true);
    expect(
      resolveInSeasonPlan({ ...base, isGameDay: false, daysSinceMaxVelocity: 2 }).offerMaxVelocity,
    ).toBe(false);
    expect(
      resolveInSeasonPlan({
        ...base,
        isGameDay: false,
        highDensity: true,
        daysSinceMaxVelocity: 30,
      }).offerMaxVelocity,
    ).toBe(false);
    expect(MAX_VELOCITY_OFFER).toMatch(/Optional/);
  });

  it("a simulated MLB week: post-game only, alternating, never eccentric overload", () => {
    const days = ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10", "2026-04-11", "2026-04-12"];
    let last: "A" | "B" | null = null;
    const slots: string[] = [];
    for (const d of days) {
      const got = resolveInSeasonPlan({
        ...base,
        planDate: d,
        isGameDay: true,
        lastLiftSlot: last,
      });
      expect(got.timing).toBe("post_game");
      expect(got.roles.some((r) => r.method === "double_eccentric")).toBe(false);
      expect(got.roles.length).toBeLessThanOrEqual(4);
      if (got.slot) {
        slots.push(got.slot);
        last = got.slot;
      }
    }
    expect(slots.join("")).toBe("ABABABA");
  });
});
