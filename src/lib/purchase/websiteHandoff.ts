/**
 * iPhone/iPad (US-only App Store release): "Subscribe on our website".
 *
 * Signed in: the app asks the backend for a single-use sign-in token for the
 * CURRENT account, then opens hammersmodality.org/app-handoff in the phone's
 * default browser (Safari). The website signs into that same account, shows
 * checkout (Stripe), and offers "Return to the app". When the app comes back to
 * the foreground the subscription is refreshed (see nativeStorefront.ts).
 * Signed out (sign-in screen): opens the website's plans page in Safari.
 * Nothing is ever sold or paid for inside the native app.
 */
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { getPurchaseAvailability } from "./purchaseGate";

export const PURCHASE_RETURN_URL = "com.hammersmodality.app://purchase-complete";
export const WEBSITE_ORIGIN = "https://hammersmodality.org";

function refreshSubscription() {
  window.dispatchEvent(new Event("hammers:subscription-refresh"));
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  CapApp.addListener("appUrlOpen", ({ url }) => {
    if (url?.startsWith(PURCHASE_RETURN_URL)) refreshSubscription();
  });
}

/** True when the native app should show the "Subscribe on our website" link. */
export function isNativeWebsiteLink(): boolean {
  const a = getPurchaseAvailability();
  return a.isNative && a.mode === "native-linkout";
}

/**
 * Open a website URL in the default browser. Capacitor hands any window.open
 * of an outside https address to the system (Safari), not an in-app sheet.
 */
export function openInDefaultBrowser(url: string): void {
  window.open(url, "_blank");
}

/** Returns false (and does nothing) unless the native website link is allowed. */
export async function openWebsiteCheckout(nextPath = "/checkout"): Promise<boolean> {
  if (!isNativeWebsiteLink()) return false;
  install();
  const { data, error } = await supabase.functions.invoke("app-purchase-handoff", { body: { next: nextPath } });
  if (error || !data?.url) throw new Error("handoff_failed");
  openInDefaultBrowser(data.url);
  return true;
}

/** Sign-in screen (no account yet): open the website's plans page in Safari. */
export function openWebsitePlans(): boolean {
  if (!isNativeWebsiteLink()) return false;
  openInDefaultBrowser(`${WEBSITE_ORIGIN}/pricing`);
  return true;
}
