import { describe, it, expect } from "vitest";
import { rbiForAtBat, asksRunners, asksScored, parseRunners } from "./rbi";
import { atBatEntryPayload } from "./atBatEntry";

describe("RBI rules (owner Nov 5)", () => {
  it("single with a runner on 3rd who scores = 1 RBI", () => expect(rbiForAtBat("1B", [3], 1)).toBe(1));
  it("single with a runner on 3rd who does not score = 0", () => expect(rbiForAtBat("1B", [3], 0)).toBe(0));
  it("scored can never exceed runners on base", () => expect(rbiForAtBat("2B", [1], 3)).toBe(1));
  it("solo home run = 1", () => expect(rbiForAtBat("HR", [], null)).toBe(1));
  it("home run with 2 on = 3", () => expect(rbiForAtBat("HR", [1, 2], null)).toBe(3));
  it("grand slam = 4", () => expect(rbiForAtBat("HR", [1, 2, 3])).toBe(4));
  it("sac fly with a runner on 3rd = 1", () => expect(rbiForAtBat("SF", [3], 1)).toBe(1));
  it("bases-loaded walk = 1, not loaded = 0", () => {
    expect(rbiForAtBat("BB", [1, 2, 3])).toBe(1);
    expect(rbiForAtBat("BB", [1, 2])).toBe(0);
  });
  it("bases-loaded hit by pitch = 1", () => expect(rbiForAtBat("HBP", [1, 2, 3])).toBe(1));
  it("outs have no automatic RBI", () => expect(rbiForAtBat("GO", [3], 1)).toBeNull());
  it("hits ask who is on base and how many scored; HR asks only who is on", () => {
    expect(asksRunners("1B") && asksScored("1B")).toBe(true);
    expect(asksRunners("HR") && !asksScored("HR")).toBe(true);
    expect(asksRunners("K_swinging")).toBe(false);
  });
  it("runner answers parse, and the RBI saves on the game line", () => {
    expect(parseRunners("1,3")).toEqual([1, 3]);
    expect(parseRunners("none")).toEqual([]);
    const row = atBatEntryPayload({ inning: 4, result: "HR", runners_on: "1,2", rbi: String(rbiForAtBat("HR", [1, 2])) });
    expect(row.rbi).toBe(3);
    expect(row.runners_on).toBe("1,2");
  });
});
