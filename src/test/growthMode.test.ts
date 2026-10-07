import { describe, it, expect } from "vitest";
import { growthMode } from "../../supabase/functions/_shared/wic/growth/growthMode";
import { startPlanItems } from "@/lib/hammer/startPlanItems";
import { yearsOldFromDob } from "@/lib/auth/under13Lock";

describe("growth mode — measured height only", () => {
  it("no readings or one reading → off (age is never used)", () => {
    expect(growthMode([], "2026-10-06").active).toBe(false);
    expect(growthMode([{ date: "2026-09-01", inches: 64 }], "2026-10-06").active).toBe(false);
  });
  it("¾ in within ~3 months turns on for 8 weeks", () => {
    const s = growthMode([{ date: "2026-07-10", inches: 64 }, { date: "2026-10-01", inches: 64.75 }], "2026-10-06");
    expect(s.active).toBe(true);
    expect(s.until).toBe("2026-11-25");
  });
  it("½ in does not turn it on", () => {
    expect(growthMode([{ date: "2026-08-01", inches: 64 }, { date: "2026-10-01", inches: 64.5 }], "2026-10-06").active).toBe(false);
  });
  it("growth spread over more than 3 months does not count", () => {
    expect(growthMode([{ date: "2026-05-01", inches: 64 }, { date: "2026-10-01", inches: 64.8 }], "2026-10-06").active).toBe(false);
  });
  it("turns off after 8 weeks and says when", () => {
    const s = growthMode([{ date: "2026-07-10", inches: 64 }, { date: "2026-08-01", inches: 65 }], "2026-10-06");
    expect(s.active).toBe(false);
    expect(s.endedOn).toBe("2026-09-26");
  });
  it("renews while growth continues", () => {
    const s = growthMode([
      { date: "2026-06-01", inches: 64 }, { date: "2026-08-01", inches: 64.8 }, { date: "2026-09-20", inches: 65.6 },
    ], "2026-10-06");
    expect(s.active).toBe(true);
    expect(s.until).toBe("2026-11-14");
  });
});

describe("Start card wording", () => {
  it("pitchers and 2-Way see bat speed as velocity training", () => {
    for (const pos of [["P"], ["P", "SS"]]) {
      const b = startPlanItems({ positions: pos }).find((i) => i.key === "bat_speed")!;
      expect(b.title).toBe("Bat speed: velocity training");
      expect(b.detail).toBe("Bat speed builds rotational power for your swing. Throwing velocity still comes from throwing work.");
    }
    expect(startPlanItems({ positions: ["SS"] }).find((i) => i.key === "bat_speed")!.title).toBe("Bat speed");
  });
  it("no 'growing body' wording by age; growth note only when growth mode is on", () => {
    const young = startPlanItems({ positions: ["SS"], age: 14 }).find((i) => i.key === "lift")!;
    expect(young.detail).not.toMatch(/grow/i);
    const growing = startPlanItems({ positions: ["SS"], age: 20, growthActive: true }).find((i) => i.key === "lift")!;
    expect(growing.detail).toMatch(/growing/);
  });
});

describe("birthdate age", () => {
  it("whole years from birthdate", () => {
    expect(yearsOldFromDob("2013-10-07", new Date("2026-10-06T12:00:00Z"))).toBe(12);
    expect(yearsOldFromDob("2013-10-06", new Date("2026-10-06T12:00:00Z"))).toBe(13);
  });
});
