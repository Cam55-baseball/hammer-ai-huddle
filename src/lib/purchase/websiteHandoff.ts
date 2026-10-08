/**
 * US storefront only: "Subscribe on our website" from the iPhone/iPad app.
 *
 * The app asks the backend for a single-use sign-in token for the CURRENT
 * account, then opens hammersmodality.org/app-handoff in an in-app browser
 * sheet. The website signs into that same account (signing out anyone else
 * first), shows checkout, and offers "Return to the app", which comes back on
 * com.hammersmodality.app://purchase-complete. Closing the sheet or returning
 * refreshes the subscription so features unlock without reinstalling.
 */
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { getPurchaseAvailability } from "./purchaseGate";

export const PURCHASE_RETURN_URL = "com.hammersmodality.app://purchase-complete";

function refreshSubscription() {
  window.dispatchEvent(new Event("hammers:subscription-refresh"));
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  Browser.addListener("browserFinished", refreshSubscription);
  CapApp.addListener("appUrlOpen", async ({ url }) => {
    if (!url?.startsWith(PURCHASE_RETURN_URL)) return;
    try { await Browser.close(); } catch { /* already closed */ }
    refreshSubscription();
  });
}

/** Returns false (and does nothing) unless the storefront is the US. */
export async function openWebsiteCheckout(nextPath = "/checkout"): Promise<boolean> {
  const a = getPurchaseAvailability();
  if (!a.isNative || a.mode !== "native-linkout" || a.storefront !== "US") return false;
  install();
  const { data, error } = await supabase.functions.invoke("app-purchase-handoff", { body: { next: nextPath } });
  if (error || !data?.url) throw new Error("handoff_failed");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
  return true;
}
