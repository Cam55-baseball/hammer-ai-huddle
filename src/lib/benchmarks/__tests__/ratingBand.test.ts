import { describe, it, expect } from "vitest";
import { ratingBand, formatGrade, roundGrade } from "../gradeScale";
describe("Plan 4 rating bands (grades by 5s at 20+)", () => {
  it("19.9 is Sub Par and keeps its decimal", () => { expect(ratingBand(19.9)).toBe("Sub Par"); expect(formatGrade(19.9)).toBe("19.9"); });
  it("35 is Sub Par", () => expect(ratingBand(35)).toBe("Sub Par"));
  it("40 is Acceptable", () => expect(ratingBand(40)).toBe("Acceptable"));
  it("60 is Acceptable", () => expect(ratingBand(60)).toBe("Acceptable"));
  it("65 is Elite", () => expect(ratingBand(65)).toBe("Elite"));
  it("below 20 shows one decimal", () => expect(formatGrade(12.4)).toBe("12.4"));
  it("20+ rounds to the nearest 5", () => { expect(roundGrade(47)).toBe(45); expect(roundGrade(48)).toBe(50); expect(formatGrade(61)).toBe("60"); expect(roundGrade(20.4)).toBe(20); });
});
