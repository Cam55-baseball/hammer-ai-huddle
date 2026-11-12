// Add-on purchases from the app. iPhone: Early Recap via Apple in-app purchase, lessons via the native
// Stripe Apple Pay sheet. Web: Stripe Checkout (Apple Pay in Safari) for both.
import { Capacitor } from "@capacitor/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { EARLY_RECAP } from "../../../supabase/functions/_shared/addons/rules";
import type { AddonProduct } from "../../../supabase/functions/_shared/addons/rules";

export const isIOSApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export async function callFn<T = any>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let details: any = error.message;
    if (error instanceof FunctionsHttpError) {
      try { details = await error.context.json(); } catch { /* keep message */ }
    }
    const err = new Error(typeof details === "string" ? details : details?.message || details?.error || "Something went wrong");
    (err as any).code = typeof details === "object" ? details?.error : undefined;
    throw err;
  }
  return data as T;
}

async function webCheckout(product: AddonProduct, athleteId?: string) {
  const { url } = await callFn<{ url: string }>("create-addon-checkout", { product, athleteId });
  window.location.href = url;
}

function coded(code: string, message = code): Error {
  const e = new Error(message);
  (e as any).code = code;
  return e;
}

/** Build 13: a failure after the money moved is marked, so the screen never says "nothing was charged". */
async function afterPayment<T>(p: Promise<T>): Promise<T> {
  try { return await p; } catch (e) { (e as any).afterPayment = true; throw e; }
}

async function appleRecap(payerId: string, athleteId?: string) {
  const { NativePurchases, PURCHASE_TYPE } = await import("@capgo/native-purchases");
  let tx: { transactionId: string };
  try {
    tx = await NativePurchases.purchaseProduct({
      productIdentifier: EARLY_RECAP.appleProductId,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: true,
      appAccountToken: payerId, // ties the Apple transaction to this account; checked on the server
      quantity: 1,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? "");
    if (/cancel/i.test(msg)) return { canceled: true };
    if (/pending/i.test(msg)) throw coded("apple_pending");
    throw e;
  }
  return afterPayment(callFn("verify-apple-purchase", { transactionId: tx.transactionId, athleteId }));
}

async function nativeLessons(athleteId?: string) {
  const { Stripe, PaymentSheetEventsEnum } = await import("@capacitor-community/stripe");
  const sheet = await callFn<any>("create-lesson-payment-sheet", { athleteId });
  if (!sheet.publishableKey) throw new Error("Payments aren't set up in the app yet.");
  await Stripe.initialize({ publishableKey: sheet.publishableKey });
  await Stripe.createPaymentSheet({
    paymentIntentClientSecret: sheet.paymentIntentClientSecret,
    customerId: sheet.customerId,
    customerEphemeralKeySecret: sheet.customerEphemeralKeySecret,
    merchantDisplayName: "Hammers Modality",
    enableApplePay: true,
    applePayMerchantId: "merchant.org.hammersmodality",
    countryCode: "US",
  } as any);
  const { paymentResult } = await Stripe.presentPaymentSheet();
  if (paymentResult === PaymentSheetEventsEnum.Canceled) return { canceled: true };
  if (paymentResult !== PaymentSheetEventsEnum.Completed) throw coded("payment_failed");
  // Stripe also tells the server directly (stripe-webhook), so a lost confirm still saves the purchase.
  return afterPayment(callFn("verify-addon-payment", { action: "confirm", paymentIntentId: sheet.paymentIntentId }));
}

export async function buyAddon(product: AddonProduct, payerId: string, athleteId?: string) {
  if (isIOSApp()) return product === "early_recap" ? appleRecap(payerId, athleteId) : nativeLessons(athleteId);
  return webCheckout(product, athleteId);
}

/** Under 18: ask every linked parent to approve and pay. */
export async function askParents(athleteId: string, parentIds: string[], product: AddonProduct) {
  const rows = parentIds.map((parent_user_id) => ({ athlete_user_id: athleteId, parent_user_id, product }));
  const { error } = await supabase.from("addon_parent_requests").insert(rows);
  if (error) throw error;
}
