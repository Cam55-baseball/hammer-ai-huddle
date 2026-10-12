import { describe, it, expect } from "vitest";
import { staffGateAllows } from "./staffPlanGate";

describe("staff plan gate", () => {
  it("switch off: everyone keeps access", () => {
    expect(staffGateAllows({ gateOn: false, isOwnerOrAdmin: false, hasPlan: false })).toBe(true);
  });
  it("switch on: no plan is blocked", () => {
    expect(staffGateAllows({ gateOn: true, isOwnerOrAdmin: false, hasPlan: false })).toBe(false);
  });
  it("switch on: coach plan opens coach tools", () => {
    expect(staffGateAllows({ gateOn: true, isOwnerOrAdmin: false, hasPlan: true, plan: "coach" })).toBe(true);
  });
  it("org-only tools need the Organization plan", () => {
    expect(staffGateAllows({ gateOn: true, isOwnerOrAdmin: false, hasPlan: true, plan: "coach", needsOrg: true })).toBe(false);
    expect(staffGateAllows({ gateOn: true, isOwnerOrAdmin: false, hasPlan: true, plan: "organization", needsOrg: true })).toBe(true);
  });
  it("owner/admin always allowed", () => {
    expect(staffGateAllows({ gateOn: true, isOwnerOrAdmin: true, hasPlan: false })).toBe(true);
  });
});
