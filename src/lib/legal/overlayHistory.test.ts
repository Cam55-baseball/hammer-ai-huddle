import { describe, expect, it, beforeEach } from "vitest";
import { closeLegalOverlay, legalLinkSlug, LEGAL_OVERLAY_KEY, openLegalOverlay } from "./overlayHistory";

describe("sign-up legal overlay history", () => {
  beforeEach(() => window.history.replaceState({ step: 2 }, "", "/signup/organization"));
  it("opens on the exact same sign-up step without discarding router state", () => {
    openLegalOverlay("terms");
    expect(window.location.pathname).toBe("/signup/organization");
    expect(window.history.state).toEqual({ step: 2, [LEGAL_OVERLAY_KEY]: "terms" });
  });
  it("Back returns from a nested document to the parent and then sign-up", async () => {
    openLegalOverlay("terms"); openLegalOverlay("privacy");
    const pop = () => new Promise<void>((resolve) => window.addEventListener("popstate", () => resolve(), { once: true }));
    const nested = pop(); closeLegalOverlay("privacy"); await nested;
    expect(window.history.state?.[LEGAL_OVERLAY_KEY]).toBe("terms");
    const parent = pop(); closeLegalOverlay("terms"); await parent;
    expect(window.history.state).toEqual({ step: 2 });
    expect(window.location.pathname).toBe("/signup/organization");
  });
  it("only same-origin legal links become document overlays", () => {
    expect(legalLinkSlug("/legal/medical-safety")).toBe("medical-safety");
    expect(legalLinkSlug("/terms")).toBe("terms");
    expect(legalLinkSlug("https://outside.example/legal/terms")).toBeNull();
    expect(legalLinkSlug("/dashboard")).toBeNull();
  });
});