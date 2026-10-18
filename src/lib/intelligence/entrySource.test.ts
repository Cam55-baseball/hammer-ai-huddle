import { describe, it, expect } from "vitest";
import { entrySourceLabel } from "./entrySource";
describe("entry source label", () => {
  it("labels parent and coach entries", () => {
    expect(entrySourceLabel("parent_entered")).toBe("Parent-entered");
    expect(entrySourceLabel("coach_verified")).toBe("Coach-verified");
  });
  it("never guesses old entries", () => {
    expect(entrySourceLabel(null)).toBe("Source not recorded");
  });
});
