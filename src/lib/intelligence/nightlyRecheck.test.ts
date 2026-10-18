import { describe, expect, it } from "vitest";
import { judge, NO_CHANGE_BAND } from "../../../supabase/functions/_shared/intelligence/recheck";
describe("server learning-loop outcomes", () => {
  it("preserves missing measurements", () => { expect(judge(null, 50)).toBeNull(); expect(judge(50, null)).toBeNull(); });
  it("uses the same three-point comparison in both run paths", () => {
    expect(NO_CHANGE_BAND).toBe(3);
    expect(judge(50, 52)).toBe("no_change");
    expect(judge(50, 53)).toBe("worked");
    expect(judge(50, 47)).toBe("got_worse");
  });
});