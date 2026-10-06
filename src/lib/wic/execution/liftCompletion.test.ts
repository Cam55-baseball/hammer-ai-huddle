import { describe, it, expect } from "vitest";
import { isFullLiftLog, missedStillEditable } from "./liftCompletion";

describe("a full Log sheet finishes the lift", () => {
  it("every prescribed set with reps is full", () => {
    expect(isFullLiftLog([{ reps: 8 }, { reps: 8 }, { reps: 6 }], 3)).toBe(true);
  });
  it("a set without reps leaves it partial", () => {
    expect(isFullLiftLog([{ reps: 8 }, { reps: null }, { reps: 6 }], 3)).toBe(false);
    expect(isFullLiftLog([{ reps: 8 }, { weight: 95 }], 2)).toBe(false);
  });
  it("per-side work needs both sides of every set", () => {
    expect(isFullLiftLog([{ reps: 8, side: "L" }, { reps: 8, side: "R" }, { reps: 8, side: "L" }], 4)).toBe(false);
  });
  it("nothing prescribed never counts as full", () => {
    expect(isFullLiftLog([{ reps: 8 }], 0)).toBe(false);
  });
});

describe("missed lifts stay changeable for 7 days", () => {
  it("day 7 is still open, day 8 is locked", () => {
    expect(missedStillEditable("2026-10-01", "2026-10-08")).toBe(true);
    expect(missedStillEditable("2026-10-01", "2026-10-09")).toBe(false);
  });
});
