import { describe, it, expect, vi, beforeEach } from "vitest";

const native = vi.hoisted(() => ({ on: true, platform: "ios" }));
const rpc = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const switches = vi.hoisted(() => ({ rows: [] as any[] }));
const ln = vi.hoisted(() => ({
  schedule: vi.fn(async () => ({})), cancel: vi.fn(async () => ({})),
  checkPermissions: vi.fn(async () => ({ display: "granted" })),
}));
const push = vi.hoisted(() => ({ checkPermissions: vi.fn(async () => ({ receive: "granted" })), register: vi.fn(async () => {}), addListener: vi.fn(async () => ({})) }));
const haptics = vi.hoisted(() => ({ impact: vi.fn(async () => {}), notification: vi.fn(async () => {}) }));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.on, getPlatform: () => (native.on ? native.platform : "web") } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ version: "1.0", build: "11" }), addListener: vi.fn() } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: push }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: ln }));
vi.mock("@capacitor/haptics", () => ({ Haptics: haptics, ImpactStyle: { Light: "LIGHT" }, NotificationType: { Success: "SUCCESS" } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: () => ({ select: () => ({ in: async () => ({ data: switches.rows }) }) }),
  },
}));

import { saveToken, disablePushTokenOnSignOut, registerIfAllowed, safePushLink, linkFromAction, _resetPushForTests, _currentTokenForTests } from "@/lib/native/push";
import { loadNativeFlags, clearNativeFlags, resolveNativeFlags } from "@/lib/native/nativeFlags";
import { scheduleRestAlert, cancelRestAlert, restAlertId, restAlertText, _scheduledForTests } from "@/lib/native/restAlerts";
import { hapticRestEnd, hapticSetComplete } from "@/lib/native/haptics";

const on = (k: string) => ({ feature_key: k, mode: "all", allowlist: [], updated_by: null });

beforeEach(() => {
  native.on = true; native.platform = "ios";
  switches.rows = [on("native_push_v1"), on("native_rest_alerts_v1"), on("healthkit_read_v1")];
  rpc.mockClear(); ln.schedule.mockClear(); ln.cancel.mockClear(); push.register.mockClear();
  haptics.impact.mockClear(); haptics.notification.mockClear();
  _resetPushForTests(); clearNativeFlags(); _scheduledForTests().clear();
});

describe("push tokens (native_push_v1)", () => {
  it("saving and refreshing a token goes through register_push_token (upsert by token)", async () => {
    await saveToken("AB12CD34AB12CD34AB12CD34AB12CD34");
    await saveToken("FF12CD34AB12CD34AB12CD34AB12CD34");
    expect(rpc).toHaveBeenNthCalledWith(1, "register_push_token", { _token: "AB12CD34AB12CD34AB12CD34AB12CD34", _app_version: "1.0 (11)" });
    expect(rpc).toHaveBeenNthCalledWith(2, "register_push_token", { _token: "FF12CD34AB12CD34AB12CD34AB12CD34", _app_version: "1.0 (11)" });
    expect(_currentTokenForTests()).toBe("FF12CD34AB12CD34AB12CD34AB12CD34");
  });

  it("sign out disables this phone's token", async () => {
    await saveToken("AB12CD34AB12CD34AB12CD34AB12CD34");
    rpc.mockClear();
    await disablePushTokenOnSignOut();
    expect(rpc).toHaveBeenCalledWith("disable_push_token", { _token: "AB12CD34AB12CD34AB12CD34AB12CD34" });
    expect(_currentTokenForTests()).toBeNull();
  });

  it("registers with Apple only when allowed and the switch is on; never on the web", async () => {
    expect(await registerIfAllowed("u1")).toBe(true);
    clearNativeFlags(); switches.rows = [];
    expect(await registerIfAllowed("u1")).toBe(false);
    native.on = false; clearNativeFlags();
    expect(await registerIfAllowed("u1")).toBe(false);
    expect(push.register).toHaveBeenCalledTimes(1);
  });

  it("a tapped push opens only in-app screens", () => {
    expect(linkFromAction({ notification: { data: { link: "/my-custom-activities" } } } as any)).toBe("/my-custom-activities");
    expect(safePushLink("https://evil.example")).toBeNull();
    expect(safePushLink("//evil.example")).toBeNull();
  });

  it("every iPhone-only switch (Release A + A3 + Release 0) is off for everyone on the web", async () => {
    native.on = false;
    expect(await loadNativeFlags("u1")).toEqual({ native_push_v1: false, native_rest_alerts_v1: false, healthkit_read_v1: false, healthkit_write_v1: false, app_attest_v1: false, movement_consent_v1: false });
    expect(resolveNativeFlags([{ feature_key: "native_push_v1", mode: "off", allowlist: [], updated_by: null } as any], "u1").native_push_v1).toBe(false);
  });
});

describe("rest alerts and haptics (native_rest_alerts_v1)", () => {
  it("schedules 'Rest is up: <next exercise>' for the moment rest ends, then cancels it", async () => {
    await loadNativeFlags("u1");
    const endsAt = Date.now() + 90_000;
    expect(await scheduleRestAlert("rest:a", endsAt, "Trap bar deadlift")).toBe(true);
    const n = (ln.schedule.mock.calls[0] as any)[0].notifications[0];
    expect(n).toMatchObject({ id: restAlertId("rest:a"), title: "Rest is up: Trap bar deadlift", foreground: false });
    expect(n.schedule.at.getTime()).toBe(endsAt);
    await cancelRestAlert("rest:a");
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: restAlertId("rest:a") }] });
  });

  it("a changed end time (+30 s) reschedules; the same end time does not", async () => {
    await loadNativeFlags("u1");
    const endsAt = Date.now() + 60_000;
    await scheduleRestAlert("rest:b", endsAt, null);
    await scheduleRestAlert("rest:b", endsAt, null);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
    await scheduleRestAlert("rest:b", endsAt + 30_000, null);
    expect(ln.schedule).toHaveBeenCalledTimes(2);
    expect(ln.cancel).toHaveBeenCalledTimes(1);
    expect(restAlertText(null).title).toBe("Rest is up");
  });

  it("never schedules when the switch is off, on the web, or without notification permission", async () => {
    switches.rows = []; await loadNativeFlags("u1");
    expect(await scheduleRestAlert("rest:c", Date.now() + 60_000, null)).toBe(false);
    clearNativeFlags(); switches.rows = [on("native_rest_alerts_v1")]; await loadNativeFlags("u1");
    ln.checkPermissions.mockResolvedValueOnce({ display: "denied" });
    expect(await scheduleRestAlert("rest:c", Date.now() + 60_000, null)).toBe(false);
    native.on = false;
    expect(await scheduleRestAlert("rest:c", Date.now() + 60_000, null)).toBe(false);
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it("haptics on the iPhone app; the web keeps navigator.vibrate exactly as before", async () => {
    await loadNativeFlags("u1");
    hapticRestEnd(); hapticSetComplete();
    expect(haptics.notification).toHaveBeenCalledTimes(1);
    expect(haptics.impact).toHaveBeenCalledWith({ style: "LIGHT" });
    native.on = false;
    const vibrate = vi.fn(); Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    hapticRestEnd([200, 100, 200]); hapticRestEnd(null); hapticSetComplete();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    expect(haptics.notification).toHaveBeenCalledTimes(1);
  });
});
