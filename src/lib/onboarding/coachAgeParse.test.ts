import { describe, it, expect } from "vitest";
import { parseCoachAges } from "./coachAgeParse";

describe("coach age-group text box", () => {
  it("reads the owner's example", () => {
    expect(parseCoachAges("10U–14U, high school, college, pro")).toEqual({
      ageGroups: ["10U", "11U", "12U", "13U", "14U"],
      levels: ["High school", "College", "Pro"],
    });
  });
  it("reads single ages and short names", () => {
    expect(parseCoachAges("8u, 12U travel, HS varsity, juco")).toEqual({
      ageGroups: ["8U", "12U"], levels: ["Youth", "High school", "Junior college"],
    });
  });
  it("reads 'ages 9 to 11'", () => expect(parseCoachAges("ages 9 to 11").ageGroups).toEqual(["9U", "10U", "11U"]));
  it("ignores nonsense", () => expect(parseCoachAges("whatever")).toEqual({ ageGroups: [], levels: [] }));
});
