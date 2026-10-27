import { describe, expect, it } from "vitest";
import { timerWasCutShort } from "./timerOutcome";
describe("early stopped timer presentation", () => {
  it("an early stop without an entered value is cut short", () => expect(timerWasCutShort({ stopped: true, elapsed: 1.47, target: 30, hasEnteredValue: false })).toBe(true));
  it("a typed value is never presented as cut short", () => expect(timerWasCutShort({ stopped: true, elapsed: 1.47, target: 30, hasEnteredValue: true })).toBe(false));
  it("paused work is not a stopped timer", () => expect(timerWasCutShort({ stopped: false, elapsed: 1.47, target: 30, hasEnteredValue: false })).toBe(false));
  it("a completed countdown is not cut short", () => expect(timerWasCutShort({ stopped: true, elapsed: 30, target: 30, hasEnteredValue: false })).toBe(false));
  it("unknown-duration stopwatch work has no invented early-stop target", () => expect(timerWasCutShort({ stopped: true, elapsed: 1.47, hasEnteredValue: false })).toBe(false));
});