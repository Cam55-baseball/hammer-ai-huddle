import { describe, it, expect } from "vitest";
import { resolveRecordedDuration } from "@/components/analyze/HighFpsCapture";

describe("resolveRecordedDuration", () => {
  it("uses measured record time when the container reports no duration", () => {
    expect(resolveRecordedDuration(0, 10.0)).toBe(10.0);
    expect(resolveRecordedDuration(Number.POSITIVE_INFINITY, 10.0)).toBe(10.0);
    expect(resolveRecordedDuration(Number.NaN, 10.0)).toBe(10.0);
  });
  it("trusts a real container duration", () => {
    expect(resolveRecordedDuration(9.98, 10.0)).toBe(9.98);
  });
});
