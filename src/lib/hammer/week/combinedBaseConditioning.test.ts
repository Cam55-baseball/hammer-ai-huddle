import { describe, it, expect } from "vitest";
import { weeklyMinimums, runningCardTitle } from "./weeklyVolume";
describe("Base running + conditioning are one session (owner Oct 30)", () => {
  it("5Tool and Golden 2Way meet the higher floor of 2", () => {
    expect(weeklyMinimums(["baserunning"], "5tool").baserunning).toBe(2);
    expect(weeklyMinimums(["baserunning"], "golden_2way").baserunning).toBe(2);
  });
  it("one combined card title for 5Tool/G2W; Complete Pitcher keeps Conditioning", () => {
    expect(runningCardTitle({ has5Tool: true, hasG2W: false })).toBe("Base running & conditioning");
    expect(runningCardTitle({ has5Tool: false, hasG2W: true })).toBe("Base running & conditioning");
    expect(runningCardTitle({ has5Tool: false, hasG2W: false })).toBe("Conditioning");
  });
});
