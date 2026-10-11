import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({}) }));
import { displayBody } from "@/lib/legal/legalV2";
const body = "Send our designated agent a written notice that includes:\n- x\n\n# Designated agent\n**[PLACEHOLDER — registered DMCA agent name]**\n[OWNER/LAWYER: register]\n\n# Counter-notice\nText";
describe("copyright page before a DMCA agent is registered", () => {
  it("shows the contact email and no placeholder", () => {
    const out = displayBody("copyright", body);
    expect(out).toContain("Copyright notices: [hammersmodality@hammersmodality.org]");
    expect(out).not.toMatch(/PLACEHOLDER|OWNER\/LAWYER/);
    expect(out).toContain("# Counter-notice");
  });
  it("leaves other documents untouched", () => expect(displayBody("terms", body)).toBe(body));
});
import { stripDraftNotes } from "@/lib/legal/legalV2";
describe("lawyer drafting notes", () => {
  it("are removed from what readers see", () => {
    expect(stripDraftNotes("Refunds apply.\n[LAWYER: confirm refund terms.]\nEnd")).toBe("Refunds apply.\n\nEnd".replace("\n\n", "\n\n"));
    expect(stripDraftNotes("A [OWNER/LAWYER: x] B")).not.toMatch(/LAWYER/);
  });
});
