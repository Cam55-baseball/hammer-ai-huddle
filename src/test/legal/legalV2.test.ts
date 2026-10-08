import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({}) }));
import { pendingAcceptances, autoRenewalSentence, PUBLIC_LEGAL_DOCS } from "@/lib/legal/legalV2";

describe("legal_v2 rules", () => {
  it("asks to accept a document never accepted", () => {
    expect(pendingAcceptances({ terms: 1 }, {}, ["terms"])).toEqual(["terms"]);
  });
  it("asks again when a newer version exists", () => {
    expect(pendingAcceptances({ terms: 2 }, { terms: { document_version: 1, choice: "accepted" } }, ["terms"])).toEqual(["terms"]);
  });
  it("does not ask when the latest version is accepted", () => {
    expect(pendingAcceptances({ terms: 2 }, { terms: { document_version: 2, choice: "accepted" } }, ["terms"])).toEqual([]);
  });
  it("auto-renewal sentence states period, price and until-cancel", () => {
    expect(autoRenewalSentence("month", "$29")).toMatch(/^I agree my plan renews automatically every month at \$29 until I cancel\./);
  });
  it("home page lists the Consumer Health Data Privacy Policy by that exact name", () => {
    expect(PUBLIC_LEGAL_DOCS.map((d) => d.title)).toContain("Consumer Health Data Privacy Policy");
  });
});
