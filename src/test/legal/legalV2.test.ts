import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({}) }));
import { pendingAcceptances, autoRenewalSentence, PUBLIC_LEGAL_DOCS } from "@/lib/legal/legalV2";

describe("legal_v2 rules", () => {
  it("asks to accept a document never accepted", () => {
    expect(pendingAcceptances({ terms: 1 }, {}, ["terms"])).toEqual(["terms"]);
  });
  it("asks again when a newer version exists (documents without a cap)", () => {
    expect(pendingAcceptances({ eula: 2 }, { eula: { document_version: 1, choice: "accepted" } }, ["eula"])).toEqual(["eula"]);
  });
  it("Terms v2 (coach/org fair use) does not make players accept again (owner 2026-10-13)", () => {
    expect(pendingAcceptances({ terms: 2 }, { terms: { document_version: 1, choice: "accepted" } }, ["terms"])).toEqual([]);
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

describe("under-13 scouting wording update (owner 2026-10-12)", () => {
  it("privacy and consumer health v2 do not force re-acceptance of v1", () => {
    const st = { privacy: { document_version: 1, choice: "accepted" }, "consumer-health-data": { document_version: 1, choice: "accepted" } };
    expect(pendingAcceptances({ privacy: 2, "consumer-health-data": 2 }, st, ["privacy", "consumer-health-data"])).toEqual([]);
  });
  it("someone who never accepted still has to accept", () => {
    expect(pendingAcceptances({ privacy: 2 }, {}, ["privacy"])).toEqual(["privacy"]);
  });
});
