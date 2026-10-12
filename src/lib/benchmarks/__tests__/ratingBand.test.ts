import { describe, it, expect } from "vitest";
import { ratingBand, formatGrade } from "../gradeScale";
describe("Plan 4 rating bands", () => {
  it("39.9 is Sub Par", () => expect(ratingBand(39.9)).toBe("Sub Par"));
  it("40 is Acceptable", () => expect(ratingBand(40)).toBe("Acceptable"));
  it("60 is Acceptable", () => expect(ratingBand(60)).toBe("Acceptable"));
  it("60.1 is Elite", () => expect(ratingBand(60.1)).toBe("Elite"));
  it("below 20 shows one decimal", () => expect(formatGrade(12.4)).toBe("12.4"));
});
