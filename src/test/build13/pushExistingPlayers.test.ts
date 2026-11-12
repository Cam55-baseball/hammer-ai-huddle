// Owner Nov 12 (build 13 fix 3): existing players are asked once; Settings can turn phone notifications on.
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  receive: "prompt" as string, afterRequest: "granted" as string, flagOn: true, ios: true,
  request: vi.fn(), register: vi.fn(async () => true), prefs: new Map<string, string>(),
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: h.receive }),
    requestPermissions: async () => { h.request(); h.receive = h.afterRequest; return { receive: h.receive }; },
  },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: async ({ key }: any) => ({ value: h.prefs.get(key) ?? null }), set: async ({ key, value }: any) => { h.prefs.set(key, value); } },
}));
vi.mock("@/lib/native/nativeFlags", () => ({
  isNativeIos: () => h.ios,
  loadNativeFlags: async () => ({ native_push_v1: h.flagOn }),
}));
vi.mock("@/lib/native/push", () => ({ registerIfAllowed: h.register }));
vi.mock("../../lib/native/nativeFlags", () => ({ isNativeIos: () => h.ios, loadNativeFlags: async () => ({ native_push_v1: h.flagOn }) }));
vi.mock("../../lib/native/push", () => ({ registerIfAllowed: h.register }));

import { askedBefore, phonePushState, rememberAsked, shouldOfferExistingPrompt, stateFromPermission, turnOnPhonePush } from "@/lib/native/pushPermission";

beforeEach(() => { h.receive = "prompt"; h.afterRequest = "granted"; h.flagOn = true; h.ios = true; h.request.mockClear(); h.register.mockClear(); h.prefs.clear(); localStorage.clear(); });

describe("one ask for existing players", () => {
  it("shows only when iOS hasn't asked, it was never shown, and not on sign-in/onboarding screens", () => {
    expect(shouldOfferExistingPrompt({ state: "not_asked", askedBefore: false, path: "/dashboard" })).toBe(true);
    expect(shouldOfferExistingPrompt({ state: "not_asked", askedBefore: true, path: "/dashboard" })).toBe(false);
    for (const s of ["on", "declined", "off"] as const) expect(shouldOfferExistingPrompt({ state: s, askedBefore: false, path: "/dashboard" })).toBe(false);
    for (const p of ["/auth", "/signup", "/profile-setup", "/onboarding/athlete", "/get-started", "/"]) expect(shouldOfferExistingPrompt({ state: "not_asked", askedBefore: false, path: p })).toBe(false);
  });
  it("once shown it is remembered (even if web view storage is cleared), and an onboarding answer counts as the one ask", async () => {
    expect(await askedBefore("u1")).toBe(false);
    await rememberAsked("u1", "shown");
    expect(await askedBefore("u1")).toBe(true);
    localStorage.clear();
    expect(await askedBefore("u1")).toBe(true); // kept in app preferences
    h.prefs.clear();
    localStorage.setItem("hm.notifPrimerAsked.u1", "not_now:2026-11-01");
    expect(await askedBefore("u1")).toBe(true);
  });
  it("is off on the website and when native_push_v1 is off for the person", async () => {
    h.flagOn = false;
    expect(await phonePushState("u1")).toBe("off");
    h.flagOn = true; h.ios = false;
    expect(await phonePushState("u1")).toBe("off");
  });
});

describe("Settings → Phone notifications", () => {
  it("reads the iPhone permission as On / not asked / declined", () => {
    expect(stateFromPermission("granted")).toBe("on");
    expect(stateFromPermission("denied")).toBe("declined");
    expect(stateFromPermission("prompt")).toBe("not_asked");
    expect(stateFromPermission("prompt-with-rationale")).toBe("not_asked");
  });
  it("Turn on asks iOS, then registers the phone so its token is saved", async () => {
    expect(await turnOnPhonePush("u1")).toBe("on");
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.register).toHaveBeenCalledWith("u1");
  });
  it("declined in the iOS prompt: nothing is registered", async () => {
    h.afterRequest = "denied";
    expect(await turnOnPhonePush("u1")).toBe("declined");
    expect(h.register).not.toHaveBeenCalled();
  });
  it("already declined in iPhone Settings: never re-asks (the screen offers Open iPhone Settings)", async () => {
    h.receive = "denied";
    expect(await turnOnPhonePush("u1")).toBe("declined");
    expect(h.request).not.toHaveBeenCalled();
  });
});
