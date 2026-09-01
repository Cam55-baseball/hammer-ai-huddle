import { describe, it, expect } from "vitest";
import {
  resolvePostLoginRoute,
  withLoginTimeout,
  isSafeRelativePath,
  POST_LOGIN_FALLBACK_ROUTE,
} from "@/lib/auth/postLoginRoute";

/**
 * Regression suite for the login redirect.
 *
 * The failure this guards against: a successful sign-in that produced NO
 * navigation because the post-login gate reads hung or threw. Every case here
 * must yield a real route.
 */
describe("resolvePostLoginRoute", () => {
  it("always returns a route, for every gate shape (never blank)", () => {
    const shapes = [
      {},
      { roles: [] },
      { roles: ["athlete"], hasFirstEvent: true },
      { roles: ["scout"], hasStaffContext: false },
      { roles: ["coach"], hasStaffContext: false },
      { roles: ["scout"], hasStaffContext: true },
      { roles: ["coach"], hasStaffContext: true },
      { degraded: true },
      { degraded: true, roles: ["scout"] },
      { redirectTarget: null, degraded: true },
    ];
    for (const gate of shapes) {
      const route = resolvePostLoginRoute(gate);
      expect(typeof route).toBe("string");
      expect(route.startsWith("/")).toBe(true);
    }
  });

  it("falls back to the dashboard when the gate reads are degraded", () => {
    expect(resolvePostLoginRoute({ degraded: true })).toBe(POST_LOGIN_FALLBACK_ROUTE);
    // Degraded must NOT misroute a scout into athlete onboarding.
    expect(resolvePostLoginRoute({ degraded: true, roles: ["scout"] })).toBe(
      POST_LOGIN_FALLBACK_ROUTE,
    );
  });

  it("honors a safe relative redirect above every other rule", () => {
    expect(
      resolvePostLoginRoute({
        redirectTarget: "/accept-parent-invite?token=abc",
        roles: ["scout"],
        hasStaffContext: false,
      }),
    ).toBe("/accept-parent-invite?token=abc");
  });

  it("rejects off-origin redirects", () => {
    expect(isSafeRelativePath("https://evil.test")).toBe(false);
    expect(isSafeRelativePath("//evil.test")).toBe(false);
    expect(isSafeRelativePath("/ok")).toBe(true);
    expect(resolvePostLoginRoute({ redirectTarget: "//evil.test" })).toBe(
      POST_LOGIN_FALLBACK_ROUTE,
    );
  });

  it("routes staff first-run into their own onboarding", () => {
    expect(resolvePostLoginRoute({ roles: ["scout"], hasStaffContext: false })).toBe(
      "/onboarding/scout",
    );
    expect(resolvePostLoginRoute({ roles: ["coach"], hasStaffContext: false })).toBe(
      "/onboarding/coach",
    );
  });

  it("sends a completed scout to the scout dashboard", () => {
    expect(resolvePostLoginRoute({ roles: ["scout"], hasStaffContext: true })).toBe(
      "/scout-dashboard",
    );
  });

  it("sends a brand-new athlete to athlete onboarding", () => {
    expect(resolvePostLoginRoute({ roles: [], hasFirstEvent: false })).toBe(
      "/onboarding/athlete",
    );
  });

  it("sends a returning athlete to the dashboard", () => {
    expect(resolvePostLoginRoute({ roles: [], hasFirstEvent: true })).toBe(
      POST_LOGIN_FALLBACK_ROUTE,
    );
  });
});

describe("withLoginTimeout", () => {
  const fallback = { roles: [] as string[], hasFirstEvent: false, hasStaffContext: true };

  it("returns the real value when the gate resolves in time", async () => {
    const result = await withLoginTimeout(
      Promise.resolve({ roles: ["scout"], hasFirstEvent: true, hasStaffContext: true }),
      fallback,
      500,
    );
    expect(result.degraded).toBe(false);
    expect(result.value.roles).toEqual(["scout"]);
  });

  it("degrades instead of hanging when the backend never answers", async () => {
    const never = new Promise<typeof fallback>(() => {});
    const result = await withLoginTimeout(never, fallback, 30);
    expect(result.degraded).toBe(true);
    expect(resolvePostLoginRoute({ ...result.value, degraded: result.degraded })).toBe(
      POST_LOGIN_FALLBACK_ROUTE,
    );
  });

  it("degrades instead of throwing when the backend errors", async () => {
    const result = await withLoginTimeout(
      Promise.reject(new Error("503 schema cache unavailable")),
      fallback,
      500,
    );
    expect(result.degraded).toBe(true);
    expect(result.value).toEqual(fallback);
  });
});
