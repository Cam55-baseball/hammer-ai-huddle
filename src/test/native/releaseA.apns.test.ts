import { describe, it, expect, vi } from "vitest";
import { apnsPayload, makeProviderTokenCache, normalizePem, sendToToken, type FetchLike } from "../../../supabase/functions/_shared/push/apns";

const msg = { title: "From your coach", body: "Coach Sam sent you a lifting workout for Monday", link: "/my-custom-activities" };
const reply = (status: number, body = "") => ({ status, text: async () => body });

function fake(...replies: Array<{ status: number; text: () => Promise<string> }>) {
  const calls: string[] = [];
  const fn: FetchLike = vi.fn(async (url: string) => { calls.push(url); return replies.shift() ?? reply(500); });
  return { fn, calls };
}

describe("send-push APNs rules (owner Nov 8)", () => {
  it("success: a new token is sent to PRODUCTION first and the environment is remembered", async () => {
    const { fn, calls } = fake(reply(200));
    const r = await sendToToken(fn, "jwt", "com.hammersmodality.app", { id: "t1", token: "ab12", apns_env: null }, msg);
    expect(calls).toEqual(["https://api.push.apple.com/3/device/ab12"]);
    expect(r).toEqual({ tokenId: "t1", status: "sent", env: "production", envChanged: true });
  });

  it("BadDeviceToken on production → retries SANDBOX once and stores sandbox", async () => {
    const { fn, calls } = fake(reply(400, JSON.stringify({ reason: "BadDeviceToken" })), reply(200));
    const r = await sendToToken(fn, "jwt", "com.hammersmodality.app", { id: "t1", token: "ab12", apns_env: null }, msg);
    expect(calls).toEqual(["https://api.push.apple.com/3/device/ab12", "https://api.sandbox.push.apple.com/3/device/ab12"]);
    expect(r).toEqual({ tokenId: "t1", status: "sent", env: "sandbox", envChanged: true });
  });

  it("410 Unregistered → the token is disabled (no retry)", async () => {
    const { fn, calls } = fake(reply(410, JSON.stringify({ reason: "Unregistered" })));
    const r = await sendToToken(fn, "jwt", "x", { id: "t1", token: "ab12", apns_env: "production" }, msg);
    expect(calls).toHaveLength(1);
    expect(r).toEqual({ tokenId: "t1", status: "disabled", reason: "Unregistered" });
  });

  it("an auth problem (403 InvalidProviderToken) fails without disabling the token", async () => {
    const { fn } = fake(reply(403, JSON.stringify({ reason: "InvalidProviderToken" })));
    const r = await sendToToken(fn, "jwt", "x", { id: "t1", token: "ab12", apns_env: "production" }, msg);
    expect(r.status).toBe("failed");
    expect((r as any).error).toContain("InvalidProviderToken");
  });

  it("a token known to be sandbox tries sandbox first and reports no change", async () => {
    const { fn, calls } = fake(reply(200));
    const r = await sendToToken(fn, "jwt", "x", { id: "t1", token: "ab12", apns_env: "sandbox" }, msg);
    expect(calls[0]).toContain("api.sandbox.push.apple.com");
    expect(r).toMatchObject({ status: "sent", env: "sandbox", envChanged: false });
  });

  it("sends the right headers and carries the tap link in the payload", async () => {
    const fn = vi.fn(async () => reply(200)) as unknown as FetchLike;
    await sendToToken(fn, "JWT", "com.hammersmodality.app", { id: "t", token: "ab", apns_env: null }, msg);
    const init = (fn as any).mock.calls[0][1];
    expect(init.headers).toMatchObject({ authorization: "bearer JWT", "apns-topic": "com.hammersmodality.app", "apns-push-type": "alert" });
    expect(JSON.parse(init.body)).toEqual(apnsPayload(msg));
    expect(apnsPayload(msg)).toEqual({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, link: "/my-custom-activities" });
  });

  it("reads the .p8 key whether pasted with line breaks, escaped \\n, or on one line", () => {
    const body = "A".repeat(70) + "B".repeat(30);
    const want = `-----BEGIN PRIVATE KEY-----\n${"A".repeat(64)}\n${"A".repeat(6)}${"B".repeat(30)}\n-----END PRIVATE KEY-----\n`;
    expect(normalizePem(`-----BEGIN PRIVATE KEY-----\n${body.slice(0, 50)}\n${body.slice(50)}\n-----END PRIVATE KEY-----`)).toBe(want);
    expect(normalizePem(`-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`)).toBe(want);
    expect(normalizePem(`-----BEGIN PRIVATE KEY----- ${body} -----END PRIVATE KEY-----`)).toBe(want);
  });

  it("reuses the signed Apple token for 40 minutes, then signs a new one", async () => {
    let t = 0; let n = 0;
    const get = makeProviderTokenCache(async () => `jwt${++n}`, () => t);
    expect(await get()).toBe("jwt1");
    t = 39 * 60_000; expect(await get()).toBe("jwt1");
    t = 41 * 60_000; expect(await get()).toBe("jwt2");
  });
});
