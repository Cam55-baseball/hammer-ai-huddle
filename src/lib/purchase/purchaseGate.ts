/**
 * PURCHASE GATE — the single source of truth for "may we show purchase UI?"
 *
 * Nothing else in the app is allowed to decide this. Every paywall, price,
 * upgrade nudge, badge or "view plans" button must ask `getPurchaseAvailability()`.
 *
 * Why this exists: on iOS we plan to link out to our existing web checkout for
 * United States users only. Outside the US, Apple's anti-steering rules mean the
 * app must show no purchase options and no purchase language whatsoever — not a
 * price, not a "subscribe", not a "manage your plan on the website", not a link.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ FAIL CLOSED. READ BEFORE "FIXING".                                      │
 * │ When we cannot determine the App Store storefront country, purchase UI  │
 * │ is HIDDEN. This is deliberately the opposite of the usual "default to   │
 * │ visible" instinct. An unwrapped or half-configured native build must    │
 * │ show nothing rather than risk showing purchase options in a country     │
 * │ where that is a straight App Store rejection.                           │
 * │ Do not add a fallback guess here.                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Web behaviour is unchanged: if we are not inside a native app shell, purchase
 * UI is allowed exactly as it has always been.
 */

export type PurchaseMode = "web" | "native-linkout" | "hidden";

export interface PurchaseAvailability {
  /** True when prices, subscribe buttons and upgrade language may be rendered. */
  canShowPurchaseUI: boolean;
  /** True when running inside a native app shell (iOS/Android wrapper). */
  isNative: boolean;
  /** How the purchase should be presented, when it may be shown at all. */
  mode: PurchaseMode;
  /** Storefront country code (ISO-3166 alpha-2, uppercase) or null when unknown. */
  storefront: string | null;
  /** Human-readable explanation, for debugging and support only. Never shown to users. */
  reason: string;
}

/**
 * Native detection.
 *
 * Nothing native exists in this project yet (no Capacitor, by design). The
 * native layer will set `window.__HAMMERS_NATIVE__ = true` on boot. Until then
 * this is always false, so the web app behaves exactly as it does today.
 */
export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as { __HAMMERS_NATIVE__?: boolean }).__HAMMERS_NATIVE__ === true;
}

/**
 * Storefront provider — PLACEHOLDER.
 *
 * Returns null (unknown) today. The native layer will supply the real value from
 * the App Store storefront once Capacitor and a store plugin are added.
 *
 * Deliberately NOT derived from IP address, browser locale, timezone or phone
 * language. All of those are wrong for VPN users and travellers, and a wrong
 * answer here is an App Store rejection. Unknown stays unknown.
 */
export function getStorefrontCountry(): string | null {
  if (typeof window === "undefined") return null;
  const raw = (window as unknown as { __HAMMERS_STOREFRONT__?: unknown }).__HAMMERS_STOREFRONT__;
  if (typeof raw !== "string" || raw.trim().length !== 2) return null;
  return raw.trim().toUpperCase();
}

export function getPurchaseAvailability(): PurchaseAvailability {
  const native = isNativeShell();

  // 1. Plain web — unchanged behaviour, purchases allowed.
  if (!native) {
    return {
      canShowPurchaseUI: true,
      isNative: false,
      mode: "web",
      storefront: null,
      reason: "web build: purchase UI unchanged",
    };
  }

  const storefront = getStorefrontCountry();

  // 2. Native + known United States storefront — allowed, as a link-out.
  if (storefront === "US") {
    return {
      canShowPurchaseUI: true,
      isNative: true,
      mode: "native-linkout",
      storefront,
      reason: "native build with US storefront: link-out purchase allowed",
    };
  }

  // 3. Everything else, INCLUDING unknown storefront — hidden. Fail closed.
  return {
    canShowPurchaseUI: false,
    isNative: true,
    mode: "hidden",
    storefront,
    reason: storefront
      ? `native build with non-US storefront (${storefront}): purchase UI hidden`
      : "native build with unknown storefront: purchase UI hidden (fail closed)",
  };
}
