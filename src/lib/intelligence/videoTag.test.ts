import { describe, expect, it } from "vitest";
import { validVideoTagTime } from "./videoTag";
describe("video-tagged event evidence", () => {
  it("requires a real nonnegative timestamp", () => {
    expect(validVideoTagTime(-1, 20)).toBe(false);
    expect(validVideoTagTime(NaN, 20)).toBe(false);
    expect(validVideoTagTime(0, 20)).toBe(true);
  });
  it("rejects a tag beyond the clip duration", () => {
    expect(validVideoTagTime(21, 20)).toBe(false);
    expect(validVideoTagTime(20, 20)).toBe(true);
  });
});