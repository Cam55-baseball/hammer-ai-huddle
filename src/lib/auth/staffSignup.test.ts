import { describe, it, expect } from "vitest";
import { staffAgeProblem } from "./staffSignup";

const today = new Date("2026-10-15T12:00:00");
describe("staff sign-up age rule", () => {
  it("allows someone who turned 18 today", () => expect(staffAgeProblem("2008-10-15", today)).toBeNull());
  it("refuses someone one day short of 18", () => expect(staffAgeProblem("2008-10-16", today)).toMatch(/18 and over/));
  it("needs a birthdate", () => expect(staffAgeProblem("", today)).toMatch(/date of birth/));
});
