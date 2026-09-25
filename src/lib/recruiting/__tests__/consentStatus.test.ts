import { describe, it, expect } from "vitest";
import { scopeVisible, statusLine, CONSENT_SCOPES, type GranularConsent } from "../consentStatus";

const base: GranularConsent = {
  visibility_enabled: true, parent_authorized: false, guardian_consented_at: null, is_minor: true,
  share_profile: true, share_metrics: true, share_video: true, allow_contact: true,
};

describe("granular recruiting consent", () => {
  it("minor with every item on but no guardian record: nothing visible", () => {
    for (const s of CONSENT_SCOPES) expect(scopeVisible(base, s)).toBe(false);
    expect(statusLine(base)).toMatch(/guardian has to say yes/);
  });
  it("parent_authorized without who/when stamp is still closed", () => {
    const c = { ...base, parent_authorized: true };
    expect(scopeVisible(c, "profile")).toBe(false);
  });
  it("guardian captured: each item follows its own switch", () => {
    const c = { ...base, parent_authorized: true, guardian_consented_at: "2026-09-25T00:00:00Z", share_video: false, allow_contact: false };
    expect(scopeVisible(c, "profile")).toBe(true);
    expect(scopeVisible(c, "video")).toBe(false);
    expect(statusLine(c)).toBe("Right now, scouts and coaches can see your profile and metrics.");
  });
  it("one-tap revoke ends everything immediately", () => {
    const c = { ...base, is_minor: false, visibility_enabled: false };
    for (const s of CONSENT_SCOPES) expect(scopeVisible(c, s)).toBe(false);
  });
  it("adult needs no guardian", () => {
    const c = { ...base, is_minor: false, share_metrics: false, share_video: false, allow_contact: false };
    expect(statusLine(c)).toBe("Right now, scouts and coaches can see your profile.");
  });
  it("unknown consent is closed", () => {
    expect(scopeVisible(null, "profile")).toBe(false);
  });
});
