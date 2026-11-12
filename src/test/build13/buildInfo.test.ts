// Owner Nov 12 (build 13 fix 4): app build + screens' build time, and the iPhone "last seen" row.
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ native: true, platform: "ios", rpc: vi.fn(async () => ({ error: null })) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.platform } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ version: "1.0", build: "13", id: "x", name: "x" }) } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: h.rpc } }));

import { buildInfoLine, recordBuildSeen } from "@/lib/native/buildInfo";

beforeEach(() => { h.native = true; h.platform = "ios"; h.rpc.mockClear(); });

describe("build info line", () => {
  it("iPhone: app build and the screens' build time in the person's time zone", () => {
    expect(buildInfoLine({ version: "1.0", build: "13" }, "2026-11-12T21:40:00Z", "America/New_York"))
      .toBe("App build 13 (1.0) · Screens built Nov 12, 2026, 4:40 PM");
  });
  it("website: screens' build time only; a missing stamp is said, never invented", () => {
    expect(buildInfoLine(null, "2026-11-07T15:00:00Z", "America/New_York")).toBe("Screens built Nov 7, 2026, 10:00 AM");
    expect(buildInfoLine(null, null)).toBe("Screens build time not recorded");
  });
});

describe("last seen record", () => {
  it("a signed-in iPhone open saves platform, app version, app build and the screens' build time", async () => {
    expect(await recordBuildSeen("u1")).toBe(true);
    expect(h.rpc).toHaveBeenCalledWith("record_app_build_seen", expect.objectContaining({ _platform: "ios", _app_version: "1.0", _app_build: "13" }));
    expect(Object.keys((h.rpc.mock.calls[0] as any[])[1])).toContain("_web_built_at");
  });
  it("nothing is saved signed out or on the website", async () => {
    expect(await recordBuildSeen(null)).toBe(false);
    h.native = false;
    expect(await recordBuildSeen("u1")).toBe(false);
    expect(h.rpc).not.toHaveBeenCalled();
  });
});
