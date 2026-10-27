import { describe, expect, it } from "vitest";
import { judge, NO_CHANGE_BAND } from "../../../supabase/functions/_shared/intelligence/recheck";
describe("legacy server learning-loop compatibility", () => {
  it("preserves missing measurements", () => { expect(judge(null, 50)).toBeNull(); expect(judge(50, null)).toBeNull(); });
  it("retains the historical three-point comparison without claiming current-path parity", () => {
    expect(NO_CHANGE_BAND).toBe(3);
    expect(judge(50, 52)).toBe("no_change");
    expect(judge(50, 53)).toBe("worked");
    expect(judge(50, 47)).toBe("got_worse");
  });
});