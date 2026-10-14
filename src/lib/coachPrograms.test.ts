import { describe, it, expect } from "vitest";
import { coachMatchesAges } from "./coachPrograms";

const p = { user_id: "c", org_name: null, program_name: null, age_groups: ["10U", "11U", "12U", "High school"], primary_disciplines: null };

describe("coach search by age group or level", () => {
  it("finds a coach by an age group they coach", () => expect(coachMatchesAges(p, "12u")).toBe(true));
  it("finds a coach by a level they coach", () => expect(coachMatchesAges(p, "high school")).toBe(true));
  it("does not match an age group they do not coach", () => expect(coachMatchesAges(p, "16U")).toBe(false));
});
