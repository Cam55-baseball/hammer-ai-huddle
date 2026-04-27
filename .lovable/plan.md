# Fix: Sell/Share button appears to do nothing

## Root cause
The `handleSellBuild` handler in `src/pages/OwnerDashboard.tsx` calls `create-build-checkout` (which is succeeding — edge logs confirm a Stripe `cs_live_...` session was created at 19:55:08), then runs:

```ts
window.location.href = data.url;
```

The Owner Dashboard is being viewed inside the **Lovable preview iframe**. Top-level navigation from a sandboxed iframe to an external origin (`checkout.stripe.com`) is silently blocked by the browser, so the page never changes and the user sees nothing happen. The same pattern affects any in-preview Stripe redirect.

## Fix
In `src/pages/OwnerDashboard.tsx` (lines ~101–109), open the Stripe Checkout URL in a **new tab** instead of replacing the current location, with a graceful fallback:

```ts
const win = window.open(data.url, '_blank', 'noopener,noreferrer');
if (!win) {
  // Popup blocked → fall back to current-tab navigation
  window.location.href = data.url;
} else {
  toast({
    title: 'Checkout opened',
    description: 'Complete the payment in the new tab.',
  });
}
```

This matches the project's existing convention for Stripe checkout sessions (one-off payments doc: "By default open the checkout session in a new tab").

## Files to update
- `src/pages/OwnerDashboard.tsx` — replace the single `window.location.href = data.url;` line in `handleSellBuild` with the new-tab open + fallback shown above.

No edge function or DB changes needed. The function itself is healthy.
