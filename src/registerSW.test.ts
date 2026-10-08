import { describe, expect, it, vi } from "vitest";

const reload = vi.fn();
Object.defineProperty(window, "location", {
  configurable: true,
  value: { ...window.location, reload },
});

describe("service-worker return behavior", () => {
  it("contains no automatic page reload path", async () => {
    vi.resetModules();
    await import("./registerSW");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    expect(reload).not.toHaveBeenCalled();
  });
});