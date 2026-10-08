/**
 * iPhone/iPad: read the App Store storefront from the native Storefront plugin
 * (StoreKit Storefront.current.countryCode, e.g. "USA") and hand it to the
 * purchase gate. Unknown or failed = left unset = purchase UI hidden.
 * Re-read whenever the app returns to the foreground. Web: no-op.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { isNativeShell } from "./purchaseGate";

interface StorefrontPlugin {
  getCountry(): Promise<{ countryCode: string | null }>;
}
const Storefront = registerPlugin<StorefrontPlugin>("Storefront");

type W = { __HAMMERS_STOREFRONT__?: string };

/** StoreKit uses ISO alpha-3 ("USA"); the gate uses alpha-2 for the US. */
export function normalizeStorefront(code: string | null | undefined): string | null {
  if (typeof code !== "string") return null;
  const c = code.trim().toUpperCase();
  if (c === "USA" || c === "US") return "US";
  return /^[A-Z]{2,3}$/.test(c) ? c : null;
}

async function refresh(): Promise<void> {
  const w = window as unknown as W;
  // Older builds without the plugin: leave unset → unknown → hidden.
  if (!Capacitor.isPluginAvailable("Storefront")) {
    window.dispatchEvent(new Event("hammers:storefront-changed"));
    return;
  }
  let next: string | null = null;
  try {
    next = normalizeStorefront((await Storefront.getCountry()).countryCode);
  } catch {
    next = null; // plugin missing (old build) → unknown → hidden
  }
  if (next) w.__HAMMERS_STOREFRONT__ = next;
  else delete w.__HAMMERS_STOREFRONT__;
  window.dispatchEvent(new Event("hammers:storefront-changed"));
}

let installed = false;
export function installNativeStorefront(): void {
  if (installed || !isNativeShell()) return;
  installed = true;
  void refresh();
  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      void refresh();
      window.dispatchEvent(new Event("hammers:subscription-refresh"));
    }
  });
}
