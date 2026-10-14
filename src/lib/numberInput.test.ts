import { describe, it, expect } from "vitest";
import { cleanNumberText, stripLeadingZeros } from "./numberInput";

describe("number boxes never keep leading zeros", () => {
  it("typing 1 after the 0 gives 1, not 01", () => expect(cleanNumberText("01")).toBe("1"));
  it("a lone 0 stays 0", () => expect(cleanNumberText("0")).toBe("0"));
  it("an emptied box stays empty", () => expect(cleanNumberText("")).toBe(""));
  it("decimals keep one point", () => expect(cleanNumberText("007.5.2", true)).toBe("7.52"));
  it("native boxes: 01 → 1 and -05 → -5", () => { expect(stripLeadingZeros("01")).toBe("1"); expect(stripLeadingZeros("-05")).toBe("-5"); });
  it("native boxes: 0.5 is untouched", () => expect(stripLeadingZeros("0.5")).toBe("0.5"));
});
