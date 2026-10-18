import { describe, it, expect } from "vitest";
import { repeatedPain } from "./healthFlags";

const now = new Date("2026-10-18T12:00:00Z");
const day = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

describe("health flags", () => {
  it("flags pain reported 3+ times in the same spot within 14 days", () => {
    const e = [1, 3, 5].map((d) => ({ created_at: day(d), pain_location: ["ankle"], pain_scale: 5 }));
    expect(repeatedPain(e, now)).toEqual([{ area: "ankle", times: 3, lastAt: day(1) }]);
  });
  it("does not flag twice, old reports, or zero pain", () => {
    const e = [
      { created_at: day(1), pain_location: ["knee"], pain_scale: 4 },
      { created_at: day(2), pain_location: ["knee"], pain_scale: 4 },
      { created_at: day(20), pain_location: ["knee"], pain_scale: 4 },
      { created_at: day(3), pain_location: ["knee"], pain_scale: 0 },
    ];
    expect(repeatedPain(e, now)).toEqual([]);
  });
});
