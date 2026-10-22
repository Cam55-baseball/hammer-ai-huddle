import { describe, expect, it } from "vitest";
import { purchaseHandoffLanding } from "../../../../supabase/functions/_shared/purchaseHandoffLanding";

describe("purchase handoff landing", () => {
  it("lands Staff Plans on the coach and organization plans page", () => {
    expect(purchaseHandoffLanding("/staff-plans")).toBe("/staff-plans");
    expect(purchaseHandoffLanding("/staff-plans?from=app")).toBe("/staff-plans?from=app");
  });
  it.each(["/checkout", "/pricing", "/select-modules"])("keeps existing landing %s", (path) => {
    expect(purchaseHandoffLanding(path)).toBe(path);
  });
  it.each(["https://example.com/staff-plans", "//example.com", "/staff-plans-evil", "/staff-plans/other", "/staff-plans#bad", null])("rejects unapproved landing %s", (path) => {
    expect(purchaseHandoffLanding(path)).toBe("/checkout");
  });
});