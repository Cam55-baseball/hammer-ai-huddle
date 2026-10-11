import { describe, it, expect } from "vitest";
import { scopeVisible, type GranularConsent } from "../consentStatus";

const adult: GranularConsent = {
  visibility_enabled: true, parent_authorized: false, guardian_consented_at: null, is_minor: false,
  share_profile: true, share_metrics: true, share_video: true, allow_contact: true,
};

describe("Phase 2 sharing checklist", () => {
  it("health is hidden unless its own switch is on", () => {
    expect(scopeVisible(adult, "health")).toBe(false);
    expect(scopeVisible({ ...adult, share_health: true }, "health")).toBe(true);
  });
  it("academics is hidden unless its own switch is on", () => {
    expect(scopeVisible(adult, "academics")).toBe(false);
    expect(scopeVisible({ ...adult, share_academics: true }, "academics")).toBe(true);
  });
  it("health on does not turn academics on", () => {
    expect(scopeVisible({ ...adult, share_health: true }, "academics")).toBe(false);
  });
  it("under 13: contact is never open to staff even with parent yes and switch on", () => {
    const kid = { ...adult, is_minor: true, is_under_13: true, parent_authorized: true, guardian_consented_at: "2026-10-11T00:00:00Z" };
    expect(scopeVisible(kid, "contact")).toBe(false);
    expect(scopeVisible(kid, "profile")).toBe(true);
  });
});
