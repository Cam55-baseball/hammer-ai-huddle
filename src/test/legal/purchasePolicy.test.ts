import { describe, expect, it } from "vitest";
import { enforcePurchasePolicy } from "../../../supabase/functions/ai-helpdesk/purchasePolicy";
import en from "../../i18n/locales/en.json";
import de from "../../i18n/locales/de.json";
import es from "../../i18n/locales/es.json";
import fr from "../../i18n/locales/fr.json";
import nl from "../../i18n/locales/nl.json";
import ja from "../../i18n/locales/ja.json";
import ko from "../../i18n/locales/ko.json";
import zh from "../../i18n/locales/zh.json";
import checkout from "../../pages/Checkout.tsx?raw";

describe("owner's no-refund-or-results-promise rule", () => {
  it("checkout contains no refund or outcome promise", () => {
    expect(checkout).not.toMatch(/guarantee|money[ -]back|risk[ -]free|we'll refund|to fix this gap/i);
  });
  it.each(Object.entries({ en, de, es, fr, nl, ja, ko, zh }))("%s has no offer beyond a negative results disclaimer", (_name, locale) => {
    const permitted = /no guarantee of results|keine Garantie für Ergebnisse|No hay garantía de resultados|aucune garantie de résultats|geen garantie op resultaten/gi;
    const text = JSON.stringify(locale).replace(permitted, "");
    expect(text).not.toMatch(/guarantee|money[ -]back|risk[ -]free|garant[ií]|gegarand|退款保证|返金保証|환불 보장/i);
  });
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