import { describe, expect, it } from "vitest";
import { splitMarks, START_TYPES, strideFeet } from "../SprintStopwatch";

describe("SprintStopwatch — precise speed logging", () => {
  it("offers 10/20/30 yd splits only when the distance allows them", () => {
    expect(splitMarks(300)).toEqual([10, 20, 30]); // 100 yd
    expect(splitMarks(120)).toEqual([10, 20, 30]); // 40 yd
    expect(splitMarks(90)).toEqual([10, 20]); // 30 yd — no 30 yd split at the finish
    expect(splitMarks(30)).toEqual([]); // 10 yd sprint — no splits
    expect(splitMarks(null)).toEqual([]);
  });

  it("has the four start types", () => {
    expect(START_TYPES).toEqual(["standing", "3-point", "2-point", "flying"]);
  });

  it("computes average stride from steps", () => {
    expect(strideFeet(90, 15)).toBe(6);
    expect(strideFeet(90, null)).toBeNull();
    expect(strideFeet(90, 0)).toBeNull();
  });
});
