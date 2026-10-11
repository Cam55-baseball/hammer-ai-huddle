import { describe, expect, it } from "vitest";
import { enforcePurchasePolicy } from "../../../supabase/functions/ai-helpdesk/purchasePolicy";

describe("owner's no-refund-or-results-promise rule", () => {
  it.each([
    "7-day performance guarantee — no risk",
    "If you don't see measurable progress, we'll refund you.",
    "Money back if your speed does not improve",
    "Train risk-free",
    "Guaranteed results in one week",
    "Resultados garantizados", "Résultats garantis", "Garantierte Ergebnisse",
    "Gegarandeerde resultaten", "退款保证", "返金保証", "환불 보장",
  ])("blocks an invented offer: %s", (reply) => {
    const result = enforcePurchasePolicy(reply);
    expect(result.blocked).toBe(true);
    expect(result.message).not.toBe(reply);
  });
  it("preserves statutory rights and billing-error referrals", () => {
    const reply = "Refund rights required by law still apply. Contact support about a billing error.";
    expect(enforcePurchasePolicy(reply)).toEqual({ message: reply, blocked: false });
  });
  it("permits the result disclaimer only", () => {
    expect(enforcePurchasePolicy("There is no guarantee of results.").blocked).toBe(false);
    expect(enforcePurchasePolicy("There is no guarantee of results. But money back is available.").blocked).toBe(true);
  });
});