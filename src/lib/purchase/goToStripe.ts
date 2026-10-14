/**
 * One way to send a buyer to Stripe Checkout.
 * - Top-level page: same-tab navigation (phones block late new windows).
 * - Inside a frame (e.g. an editor preview): Stripe refuses to load in frames
 *   and the frame may not navigate its parent, so we ask the person to tap
 *   "Continue to secure checkout", which opens Stripe in a new tab from a real tap.
 */
export const STRIPE_HANDOFF_EVENT = "hammers:stripe-handoff";

export function isFramed(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

export function goToStripe(url: string, where = "checkout"): void {
  if (!url || !/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) {
    console.error(`[checkout:${where}] not a Stripe URL`, url);
    window.dispatchEvent(new CustomEvent(STRIPE_HANDOFF_EVENT, { detail: { url: null, error: "Checkout could not start. Please try again." } }));
    return;
  }
  if (isFramed()) {
    console.info(`[checkout:${where}] framed — asking for a tap to open Stripe in a new tab`);
    window.dispatchEvent(new CustomEvent(STRIPE_HANDOFF_EVENT, { detail: { url } }));
    return;
  }
  window.location.assign(url);
  // If the browser didn't leave (blocked or stalled), offer the button.
  setTimeout(() => {
    if (document.visibilityState === "visible") window.dispatchEvent(new CustomEvent(STRIPE_HANDOFF_EVENT, { detail: { url } }));
  }, 4000);
}

/** Report a checkout failure: always visible to the person, always logged. */
export function reportCheckoutError(where: string, reason: string) {
  console.error(`[checkout:${where}]`, reason);
  window.dispatchEvent(new CustomEvent(STRIPE_HANDOFF_EVENT, { detail: { url: null, error: reason } }));
}
