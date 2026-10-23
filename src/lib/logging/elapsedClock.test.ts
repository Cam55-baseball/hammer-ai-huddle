import { describe, expect, it } from "vitest";
import { clockHundredths, elapsedHundredths } from "./elapsedClock";
describe("elapsed hundredths", () => {
  it("preserves an elapsed 1.47-second effort", () => {
    expect(elapsedHundredths(1000, 2470)).toBe(1.47);
    expect(clockHundredths(1.47)).toBe("0:01.47");
  });
  it("carries hundredths across seconds and minutes without displaying 60 seconds", () => {
    expect(clockHundredths(59.999)).toBe("1:00.00");
    expect(clockHundredths(60.47)).toBe("1:00.47");
  });
});