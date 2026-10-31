import { describe, expect, it } from "vitest";
import { easeBackLoadPct, isExperiencedLifter, liftFloorSets } from "./returner.ts";
import { runGovernor } from "./governor.ts";

describe("Fix 9 — experienced returners", () => {
  it("stated history or lifting age of 2+ years is experienced", () => {
    expect(isExperiencedLifter({ total_years: 8 }, null)).toBe(true);
    expect(isExperiencedLifter(null, 3)).toBe(true);
    expect(isExperiencedLifter({ total_years: 1 }, null)).toBe(false);
    expect(isExperiencedLifter(null, null)).toBe(false);
  });

  it("experienced floor is the template's lowest legal set count", () => {
    expect(liftFloorSets(5, 4, true)).toBe(4);
    expect(liftFloorSets(3, 4, true)).toBe(3); // never adds sets
    expect(liftFloorSets(5, 4, false)).toBe(1); // new lifter keeps the ramp
  });

  it("easing back caps intensity at 70%", () => {
    expect(easeBackLoadPct(72)).toBe(70);
    expect(easeBackLoadPct(65)).toBe(65);
    expect(easeBackLoadPct(null)).toBe(null);
  });

  it("the spike cap keeps 4 sets for an experienced lifter's squat", () => {
    const gov = runGovernor({
      items: [{ slug: "squat", name: "Squat", channel: "LIFT", tier: "high", sets: 5, amountPerSet: 1, floorSets: 4, substitutionFamily: null } as any],
      rm28: { byChannel: { LIFT: 1 } } as any,
      ctx: { block: "B1", inSeason: false, growthMode: false },
      noDropChannels: ["LIFT"],
    });
    expect(gov.items[0].sets).toBe(4);
    expect(gov.items.length).toBe(1);
  });
});
