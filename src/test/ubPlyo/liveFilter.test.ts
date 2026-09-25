import { describe, it, expect } from "vitest";
import { filterUbCatalog, ubTierBlocked, trainingAgeBand, type UbLiveInput } from "../../../supabase/functions/_shared/wic/ubPlyo/liveFilter";

const base: UbLiveInput = {
  phase: "os_q3", ageYears: 18, trainingAge: "advanced", growthMode: false, throwingArmAthlete: false,
  startDayOffsets: [], history: { u1SessionsLast8w: 8, u2SessionsLast10w: 8, u2u3SessionsThisWeek: 0 }, painFlag: false,
};
const rows = [{ slug: "a", ub_tier: "U1" }, { slug: "b", ub_tier: "U2" }, { slug: "c", ub_tier: "U3" }, { slug: "d", ub_tier: null }];

describe("UB plyo live filter", () => {
  it("cleared athlete keeps every tier", () => expect(filterUbCatalog(rows, base).removed).toBe(0));
  it("in season: U1 only", () => expect(filterUbCatalog(rows, { ...base, phase: "in_season" }).rows.map((r) => r.slug)).toEqual(["a", "d"]));
  it("unknown age fails closed for U2/U3, U1 stays", () => {
    expect(filterUbCatalog(rows, { ...base, ageYears: null }).rows.map((r) => r.slug)).toEqual(["a", "d"]);
  });
  it("U3 needs 16+ advanced", () => {
    expect(ubTierBlocked("U3", { ...base, ageYears: 15 })).toBe("age");
    expect(ubTierBlocked("U2", { ...base, ageYears: 15, trainingAge: "intermediate" })).toBeNull();
  });
  it("growth mode blocks U2/U3", () => expect(ubTierBlocked("U2", { ...base, growthMode: true })).toBe("age"));
  it("earned-by history", () => expect(ubTierBlocked("U2", { ...base, history: { ...base.history, u1SessionsLast8w: 5 } })).toBe("history"));
  it("weekly cap of two", () => expect(ubTierBlocked("U2", { ...base, history: { ...base.history, u2u3SessionsThisWeek: 2 } })).toBe("weekly_cap"));
  it("pitcher: none the day before, of, or after a start", () => {
    for (const o of [-1, 0, 1]) expect(ubTierBlocked("U2", { ...base, throwingArmAthlete: true, startDayOffsets: [o] })).toBe("start_window");
    expect(ubTierBlocked("U2", { ...base, throwingArmAthlete: true, startDayOffsets: [2] })).toBeNull();
  });
  it("pain blocks U2/U3", () => expect(ubTierBlocked("U3", { ...base, painFlag: true })).toBe("pain"));
  it("U1 is never removed", () => {
    expect(ubTierBlocked("U1", { ...base, phase: "in_season", ageYears: null, painFlag: true })).toBeNull();
  });
  it("training age bands", () => {
    expect(trainingAgeBand(null, false)).toBeNull();
    expect(trainingAgeBand(0.5, false)).toBe("beginner");
    expect(trainingAgeBand(3, false)).toBe("intermediate");
    expect(trainingAgeBand(5, true)).toBe("professional");
  });
});

import { ubGrowthMode } from "../../../supabase/functions/_shared/wic/ubPlyo/liveFilter";
describe("UB plyo growth mode from real height checks", () => {
  const kid = { ...base, ageYears: 14, trainingAge: "intermediate" as const, phase: "os_q2" as const };
  it("14-year-old intermediate, no growth → U2 allowed", () => {
    const g = ubGrowthMode(14, [{ date: "2026-06-01", inches: 64 }, { date: "2026-09-01", inches: 64.25 }], "2026-09-25");
    expect(g).toBe(false);
    expect(ubTierBlocked("U2", { ...kid, growthMode: g })).toBeNull();
  });
  it("14-year-old intermediate who grew an inch this month → U2 blocked", () => {
    const g = ubGrowthMode(14, [{ date: "2026-08-28", inches: 64 }, { date: "2026-09-22", inches: 65 }], "2026-09-25");
    expect(g).toBe(true);
    expect(ubTierBlocked("U2", { ...kid, growthMode: g })).toBe("age");
  });
  it("unknown height history → not in growth mode", () => {
    expect(ubGrowthMode(14, [], "2026-09-25")).toBe(false);
    expect(ubGrowthMode(null, [{ date: "2026-09-01", inches: 60 }], "2026-09-25")).toBe(false);
  });
});
