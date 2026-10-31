import { describe, expect, it } from "vitest";
import { easeBackLoadPct, isExperiencedLifter, liftFloorSets } from "../../../supabase/functions/_shared/wic/exposure/returner.ts";
import { runGovernor } from "../../../supabase/functions/_shared/wic/exposure/governor.ts";
import { isMainLiftDay, primerOnStrengthRowsOnly } from "../../../supabase/functions/_shared/wic/pap/powerPrimer.ts";
import { buildShadowInputs, tissuePhaseFromWk } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter.ts";

describe("Fix 9 — experienced returners keep template sets", () => {
  it("stated history or lifting age of 2+ years is experienced", () => {
    expect(isExperiencedLifter({ total_years: 8 }, null)).toBe(true);
    expect(isExperiencedLifter(null, 3)).toBe(true);
    expect(isExperiencedLifter({ total_years: 1 }, null)).toBe(false);
    expect(isExperiencedLifter(null, null)).toBe(false);
  });
  it("floor is the template's lowest legal set count, never more than planned", () => {
    expect(liftFloorSets(5, 4, true)).toBe(4);
    expect(liftFloorSets(3, 4, true)).toBe(3);
    expect(liftFloorSets(5, 4, false)).toBe(1);
  });
  it("easing back caps intensity at 70%", () => {
    expect(easeBackLoadPct(72)).toBe(70);
    expect(easeBackLoadPct(65)).toBe(65);
    expect(easeBackLoadPct(null)).toBe(null);
  });
  it("a tiny recent max no longer cuts an experienced squat to 1 set or drops rows", () => {
    const items: any[] = [
      { slug: "squat", name: "Squat", channel: "LIFT", tier: "high", sets: 5, amountPerSet: 1, floorSets: 4, substitutionFamily: null },
      { slug: "row", name: "Row", channel: "LIFT", tier: "high", sets: 4, amountPerSet: 1, floorSets: 4, substitutionFamily: null },
    ];
    const gov = runGovernor({ items, rm28: { byChannel: { LIFT: 4 } } as any,
      ctx: { block: "B1", inSeason: false, growthMode: false }, noDropChannels: ["LIFT"] });
    expect(gov.items.map((i) => i.sets)).toEqual([4, 4]);
  });
  it("new lifters keep the existing ramp (rows can still be cut to 1)", () => {
    const gov = runGovernor({
      items: [{ slug: "squat", name: "Squat", channel: "LIFT", tier: "high", sets: 5, amountPerSet: 1, floorSets: 1, substitutionFamily: null } as any],
      rm28: { byChannel: { LIFT: 1 } } as any, ctx: { block: "B1", inSeason: false, growthMode: false },
    });
    expect(gov.items[0]?.sets ?? 0).toBeLessThanOrEqual(1);
  });
});

describe("Fix 10 — Primer only on main lift rows", () => {
  it("strips a primer from a breathing row and keeps it on the squat", () => {
    const rows: any[] = [
      { slot: "lift", sequence_role: "mobility", movement_slug: "rc_breathing_reset", why_payload: { power_primer: {} } },
      { slot: "lift", sequence_role: "compound_lower", movement_slug: "back_squat", why_payload: { power_primer: {} } },
    ];
    expect(primerOnStrengthRowsOnly(rows)).toBe(1);
    expect(rows[0].why_payload.power_primer).toBeUndefined();
    expect(rows[1].why_payload.power_primer).toBeDefined();
  });
  it("tissue-only days are not main lift days", () => {
    expect(isMainLiftDay([{ slot: "lift", sequence_role: "trunk_primer", movement_slug: "paloff_press" }])).toBe(false);
    expect(isMainLiftDay([{ slot: "lift", sequence_role: "compound_lower", movement_slug: "back_squat" }])).toBe(true);
  });
});

describe("Fix 12 — one season source for the lift checks", () => {
  it("maps the plan builder's phases", () => {
    expect(tissuePhaseFromWk("in_season")).toBe("in_season");
    expect(tissuePhaseFromWk("os_q1")).toBe("offseason");
    expect(tissuePhaseFromWk(null)).toBe(null);
  });
  it("the plan's in-season wins over the default off-season", () => {
    const base: any = { userId: "u", today: "2026-11-02", timezone: "UTC", windowStart: "2026-10-01", horizonEnd: "2026-11-09",
      mpi: null, context: null, prescriptions: [], sessionLogs: [], games: [], calendarEvents: [], practices: [],
      throwingReps: [], speedSessions: [], quizzes: [], dailyLogs: [] };
    expect(buildShadowInputs(base).profile.phase).toBe("offseason");
    expect(buildShadowInputs({ ...base, phaseOverride: "in_season" }).profile.phase).toBe("in_season");
  });
});
