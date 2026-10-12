import { describe, it, expect } from "vitest";
import { testResults } from "./testRows";

describe("coach tests tab", () => {
  it("shows recorded results and skips context keys", () => {
    expect(testResults({ _batting_side: "R", ten_yard_dash: 1.7, bat_speed: null })).toEqual([{ label: "Ten yard dash", value: "1.7" }]);
  });
  it("empty or missing results give nothing (never invented)", () => {
    expect(testResults(null)).toEqual([]);
  });
});
