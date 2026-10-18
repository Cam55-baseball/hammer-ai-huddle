import { describe, it, expect } from "vitest";
import { judgeOutcome } from "./learningLoop";

describe("learning loop outcome", () => {
  it("worked / no change / got worse", () => {
    expect(judgeOutcome(60, 66)).toBe("worked");
    expect(judgeOutcome(60, 61)).toBe("no_change");
    expect(judgeOutcome(60, 52)).toBe("got_worse");
  });
  it("no re-measure means no result", () => {
    expect(judgeOutcome(60, null)).toBeNull();
    expect(judgeOutcome(null, 60)).toBeNull();
  });
});
