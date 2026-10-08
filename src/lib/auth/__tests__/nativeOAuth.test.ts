import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseNativeReturn, NATIVE_AUTH_CALLBACK } from "../nativeOAuth";

describe("native sign-in return", () => {
  it("uses the app's own URL scheme, not a website", () => {
    expect(NATIVE_AUTH_CALLBACK).toBe("com.hammersmodality.app://auth/callback");
  });
  it("reads a code from the query", () => {
    const r = parseNativeReturn("com.hammersmodality.app://auth/callback?redirect=%2Fdashboard&code=abc");
    expect(r.code).toBe("abc");
    expect(r.redirect).toBe("/dashboard");
  });
  it("reads tokens from the hash", () => {
    const r = parseNativeReturn("com.hammersmodality.app://auth/callback#access_token=a&refresh_token=b");
    expect([r.accessToken, r.refreshToken]).toEqual(["a", "b"]);
  });
  it("reports provider errors", () => {
    expect(parseNativeReturn("com.hammersmodality.app://auth/callback?error=access_denied").error).toBe("access_denied");
  });
});
