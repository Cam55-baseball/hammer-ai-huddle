import { describe, expect, it } from "vitest";
import { getActiveTier, hasTierForSport } from "./tierAccess";

describe("Both players buy each sport separately", () => {
  it("baseball Golden 2Way does not cover softball", () => {
    expect(hasTierForSport(["baseball_golden2way"], "golden2way", "softball")).toBe(false);
  });
  it("softball Golden 2Way does not cover baseball", () => {
    expect(hasTierForSport(["softball_golden2way"], "golden2way", "baseball")).toBe(false);
  });
  it("matches demo2way's legacy baseball program to Golden 2Way", () => {
    expect(getActiveTier(["baseball_hitting", "baseball_pitching", "baseball_throwing"], "baseball")).toBe("golden2way");
  });
});