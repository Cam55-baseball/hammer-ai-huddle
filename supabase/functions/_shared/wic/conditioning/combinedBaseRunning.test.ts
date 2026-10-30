import { describe, expect, it } from "vitest";
import { combinedRunningRowsToDrop, isCombinedBaseConditioningProgram, baseDistanceFeet } from "./combinedBaseRunning";

const rows = [
  { slot: "conditioning", movement_slug: "bases_home_2nd" },
  { slot: "conditioning", movement_slug: "rc_easy_flush" },
  { slot: "speed", movement_slug: "bases_home_2nd" },
];

describe("combined base running & conditioning", () => {
  it("5Tool and Golden 2Way are combined; Complete Pitcher is not", () => {
    expect(isCombinedBaseConditioningProgram(["baseball_5tool"], "baseball")).toBe(true);
    expect(isCombinedBaseConditioningProgram(["softball_golden2way"], "softball")).toBe(true);
    expect(isCombinedBaseConditioningProgram(["baseball_hitting", "baseball_throwing"], "baseball")).toBe(true);
    expect(isCombinedBaseConditioningProgram(["softball_hitting", "softball_pitching", "softball_throwing"], "softball")).toBe(true);
    expect(isCombinedBaseConditioningProgram(["baseball_pitcher"], "baseball")).toBe(false);
    expect(isCombinedBaseConditioningProgram(["softball_pitching"], "softball")).toBe(false);
    expect(isCombinedBaseConditioningProgram(["softball_hitting"], "baseball")).toBe(false);
  });
  it("drops running conditioning on a day without base running", () => {
    expect(combinedRunningRowsToDrop(rows, { combined: true, baserunningReady: false })).toEqual([0]);
  });
  it("keeps it on a base running day, and never touches Complete Pitcher", () => {
    expect(combinedRunningRowsToDrop(rows, { combined: true, baserunningReady: true })).toEqual([]);
    expect(combinedRunningRowsToDrop(rows, { combined: false, baserunningReady: false })).toEqual([]);
  });
  it("softball base routes are 60 ft", () => {
    expect(baseDistanceFeet("softball")).toBe(60);
    expect(baseDistanceFeet("baseball")).toBe(90);
  });
});
