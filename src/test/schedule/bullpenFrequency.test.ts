import { describe, it, expect } from "vitest";
import { pitchingDay } from "@/lib/hammer/prescription/pitchingDay";
const week = (phase: string) => Array.from({ length: 7 }, (_, i) => pitchingDay(new Date(2026, 10, 2 + i, 12), "softball", { phase } as any, null));
describe("bullpen frequency follows the pitching week", () => {
  it("off-season: at most 2 bullpens a week, Sunday rest", () => {
    const w = week("off");
    expect(w.filter((t) => t === "bullpen").length).toBeLessThanOrEqual(2);
    expect(w[6]).toBe("rest");
  });
  it("in-season: at most 2 bullpens a week", () =>
    expect(week("in").filter((t) => t === "bullpen").length).toBeLessThanOrEqual(2));
  it("day after pitching is a recovery flush", () =>
    expect(pitchingDay(new Date(2026, 10, 3, 12), "softball", { phase: "in" } as any, { pitchedYesterday: true } as any)).toBe("flush"));
});
