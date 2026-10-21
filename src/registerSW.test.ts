import { describe, expect, it, vi } from "vitest";

const reload = vi.fn();
const worker = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("workbox-window", () => ({ Workbox: worker.create }));
Object.defineProperty(window, "location", {
  configurable: true,
  value: { ...window.location, reload },
});

describe("service-worker return behavior", () => {
  it("never requests a production worker in the development preview", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]) },
    });
    const { registerSW } = await import("./registerSW");
    registerSW();
    expect(worker.create).not.toHaveBeenCalled();
  });
  it("contains no automatic page reload path", async () => {
    vi.resetModules();
    await import("./registerSW");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    expect(reload).not.toHaveBeenCalled();
  });
});