// Release 0b (owner Nov 9): the movement-consent words shown to players and parents must be the
// lawyer-approved text, word for word.
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const APPROVED =
  "Movement measurements. When you record inside the Hammers app, we use your camera to measure your movement, such as jump height, joint angles, sprint times and ground-contact times. We save these measurements to your training record to track your progress and personalize your plan. We don't sell them, and we only share them with the coaches and organizations you're connected to. Athletes under 18 need a parent or guardian to agree first. You can turn this off anytime in Settings and ask us to delete your measurement history.";

vi.mock("@capacitor/app", () => ({ App: { getInfo: vi.fn(async () => ({ version: "1", build: "11" })) } }));
vi.mock("@/lib/native/nativeFlags", () => ({
  isNativeIos: () => true,
  loadNativeFlags: vi.fn(async () => ({ movement_consent_v1: true })),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: { on: true, status: "none", minor: false, deletion_pending: false }, error: null })) },
}));

import { MOVEMENT_CONSENT_TEXT } from "@/lib/legal/movementConsent";
import { MovementConsentCard } from "@/components/native/MovementConsentCard";

describe("Movement consent text (lawyer-approved, Nov 9)", () => {
  it("the consent text equals the approved words exactly", () => {
    expect(MOVEMENT_CONSENT_TEXT).toBe(APPROVED);
  });
  it("the player's consent card shows exactly the approved words", async () => {
    render(<MovementConsentCard userId="u1" />);
    await waitFor(() => expect(screen.getByLabelText("Camera measurements")).toBeTruthy());
    const shown = [...document.querySelectorAll("p")].map((p) => p.textContent);
    expect(shown).toContain(APPROVED);
  });
});
