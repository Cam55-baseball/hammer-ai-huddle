import { describe, it, expect } from "vitest";
import { crossSportRows } from "./useWkDailyPrescriptions";
describe("Cross-sport card (owner Oct 30)", () => {
  const rows = [
    { slot: "cross_sport", id: "a" }, { slot: "cross_sport", id: "b" }, { slot: "cross_sport", id: "c" },
    { slot: "ub_primer", id: "p" }, { slot: "lift", id: "l" }, { slot: "warmup", id: "w" },
  ];
  it("keeps every cross-sport activity, whatever its placement", () => {
    expect(crossSportRows(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("never includes the strength primer, lifts or warm-ups", () => {
    expect(crossSportRows(rows).some((r) => ["p", "l", "w"].includes(r.id))).toBe(false);
  });
});
