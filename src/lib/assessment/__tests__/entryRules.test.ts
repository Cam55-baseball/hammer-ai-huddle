import { describe, expect, it } from "vitest";
import { assessmentEntryAllowed } from "../entryRules";
const fresh = { paid: true, started: false, completed: false, opened: false };
describe("once-only assessment after payment", () => {
  it("opens after confirmed payment", () => expect(assessmentEntryAllowed(fresh)).toBe(true));
  it("cannot grant access from a return URL", () => expect(assessmentEntryAllowed({ ...fresh, paid: false })).toBe(false));
  it("does not reopen after X", () => expect(assessmentEntryAllowed({ ...fresh, opened: true })).toBe(false));
  it("never reopens a completed assessment", () => expect(assessmentEntryAllowed({ ...fresh, completed: true })).toBe(false));
  it("never relocks an existing started athlete", () => expect(assessmentEntryAllowed({ ...fresh, started: true })).toBe(false));
});