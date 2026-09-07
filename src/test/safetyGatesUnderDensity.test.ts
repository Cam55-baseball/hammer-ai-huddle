/**
 * Evidence #5 — the density model must not have opened a safety door.
 *
 * The schedule layer (gameProximity) can only ever REMOVE work: it caps a
 * session to primer level, drops the lift, or lowers the CNS cap. The safety
 * gates live in a separate module that takes no schedule input at all. These
 * tests pin both halves of that claim.
 */
import { describe, it, expect } from "vitest";
import { checkSafetyGate, resolveSafetyFloor } from "../../supabase/functions/_shared/wic/domainGate.ts";
import {
  resolveGameProximity,
  survivesPrimerOnly,
  type ScheduledGame,
} from "../../supabase/functions/_shared/wic/schedule/gameProximity.ts";

const g = (o: Partial<ScheduledGame> & { date: string }): ScheduledGame =>
  ({ source: "gp_games", ...o }) as ScheduledGame;

/** Four games in seven days — the density model is on. */
const DENSE = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-11"].map((d, i) =>
  g({ id: `d${i}`, date: d, time: "18:00" }),
);

describe("safety gates are unreachable from the schedule layer", () => {
  it("deep_flexion still floors at 16+/advanced", () => {
    const floor = resolveSafetyFloor({ deep_flexion: true } as any);
    expect(floor.minAgeYears).toBe(16);
    expect(floor.minTrainingAgeClass).toBe("advanced");
  });

  it("eccentric_overload still floors at 16+/advanced", () => {
    const floor = resolveSafetyFloor({ eccentric_overload: true } as any);
    expect(floor.minAgeYears).toBe(16);
    expect(floor.minTrainingAgeClass).toBe("advanced");
  });

  it("a 14-year-old is blocked from a deep-flexion movement, dense week or not", () => {
    const m = { slug: "jefferson_curl", deep_flexion: true } as any;
    const ctx = { ageYears: 14, trainingAgeClass: "beginner", seasonPhase: "in_season" };
    expect(checkSafetyGate(m, ctx).allowed).toBe(false);
  });

  it("shoulder_end_range stays off a thrower's in-season plan", () => {
    const m = { slug: "deep_dip", shoulder_end_range: true } as any;
    const res = checkSafetyGate(m, {
      ageYears: 18,
      trainingAgeClass: "advanced",
      seasonPhase: "in_season",
      isThrowingAthlete: true,
    } as any);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("shoulder_end_range");
  });

  it("the schedule layer never produces a positive CNS adjustment", () => {
    for (let i = 0; i < 7; i++) {
      const day = `2026-09-0${7 + i}`.slice(0, 10);
      const r = resolveGameProximity(DENSE, day, { liftExposureDatesLast7: [] });
      expect(r.cnsCapDelta).toBeLessThanOrEqual(0);
    }
  });

  it("primer survivorship is a closed list — unclassified never survives", () => {
    expect(survivesPrimerOnly("low")).toBe(true);
    expect(survivesPrimerOnly("arm_care")).toBe(true);
    expect(survivesPrimerOnly("maximal")).toBe(false);
    expect(survivesPrimerOnly("moderate")).toBe(false);
    expect(survivesPrimerOnly(null)).toBe(false);
    expect(survivesPrimerOnly("something_new")).toBe(false);
  });

  it("high density only ever relaxes the 48-hour rule, never a safety gate", () => {
    const dense = resolveGameProximity(DENSE, "2026-09-10", { liftExposureDatesLast7: [] });
    expect(dense.highDensity).toBe(true);
    // The only fields the generator reads from here.
    expect(typeof dense.primerOnly).toBe("boolean");
    expect(dense.removeLift).toBe(false);
    expect(dense.cnsCapDelta).toBe(0);
    // Nothing in the payload can raise an age, flag or CNS ceiling.
    expect(Object.keys(dense)).not.toContain("minAgeOverride");
    expect(Object.keys(dense)).not.toContain("cnsCapBonus");
  });
});
