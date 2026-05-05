
## Audit Findings (current state)

- **Friction at /checkout**: Demo users still see a "See other options" toggle, a generic "Proceed to Payment" button, and must click before anything happens. No auto-redirect.
- **Stripe session** (`create-checkout/index.ts`): `mode: subscription`, metadata + ab variant ✓, wallets auto-enabled ✓. **Missing**: `automatic_tax`, `billing_address_collection`, intro/anchor pricing, post-abandon coupon support beyond raw `coupon` param.
- **Pricing display**: Shows `$300/month` + per-day framing only. No struck-through anchor, no "locked in" intro framing.
- **Recovery**: `checkout_attempts` rows are written, but a returning user sees the same screen with no urgency banner and no coupon auto-apply.
- **Success path**: 800ms spinner then redirect — too short to reduce remorse.
- **Copy**: CTA generic; guarantee not anchored adjacent to CTA on first paint.

> **No trial periods.** Per product policy, subscriptions do not offer free trials. All trial logic is excluded from this plan.

## Implementation Plan

### 1. `src/pages/Checkout.tsx`

**Auto-redirect for demo users**
- `useEffect` fires `handleCreateCheckout()` on mount when: `isFromDemo && selectedTier && !checkoutUrl && !checkoutLoading && user && !isOwner && !isAdmin && status !== 'success'`. Guard with `autoTriggeredRef` to prevent double-fire.
- During auto-trigger, render a full-screen "Reserving your system…" state so the user never sees the plan picker.

**Pricing anchor (demo only)**
- Compute `anchorPrice = Math.round(tierConfig.price * 1.33)`.
- Render struck-through `$anchor`, current `$price/month`, label "Locked in for early athletes" — only when `isFromDemo`.

**Single-path lockdown (demo only)**
- Hide "See other options" toggle when `isFromDemo`. Replace with subtle "Want a different plan?" link that opens a `Dialog` with the existing 3 tier cards.

**CTA copy**
- CTA text → `"Start my system now"` (no trial framing).
- Move 7-day guarantee block immediately under the CTA on first paint with copy: "7-day performance guarantee — no risk".

**Abandonment urgency banner + auto-coupon**
- After auth, if `isFromDemo && user`, query `checkout_attempts` for `user_id = user.id AND completed_at IS NULL AND created_at > now() - 7 days` ordered desc limit 1.
- If found → set `appliedCoupon = "RESUME10"`. Show banner: *"Your system is still reserved — finish unlocking now. 10% off applied."*
- Pass `coupon: appliedCoupon` into `create-checkout` body.

**Branded success state**
- Replace 800ms timeout with a 2.5s sequence: 3 stepped check rows ("Loading your gap data ✓", "Calibrating your system ✓", "Routing to your dashboard ✓"), then `navigate(...)`. Keep existing destination logic.

**Telemetry**
- In auto-redirect path, suppress the "Redirecting to Checkout" toast (silent).

### 2. `supabase/functions/create-checkout/index.ts`

**Stripe session hardening**
- `billing_address_collection: "auto"`
- `automatic_tax: { enabled: true }` — wrap session creation in try/catch; on failure (account not configured for Stripe Tax), retry without `automatic_tax` and log a warning.
- `phone_number_collection: { enabled: false }` (explicit)
- `allow_promotion_codes: false` when `coupon` provided OR when `from` (demo) — anchor is set by us.

**Guarantee metadata**
- Always set `checkoutMetadata.guarantee = "7_day"`.

**Coupon resilience**
- Existing `coupon` path retained. Wrap `discounts: [{ coupon }]` in try/catch — if Stripe returns `resource_missing` (e.g. `RESUME10` missing), retry session creation without discount and return `couponSkipped: true` in JSON. Frontend ignores silently.

**Explicitly NOT added**
- `trial_period_days` — not used.
- `subscription_data.trial_*` fields — not used.
- No `checkoutMetadata.trial`.

### 3. Stripe coupon

- After approval, run `stripe--create_coupon` with `name: "RESUME10"`, `percent_off: 10`, `duration: "once"` so abandonment recovery has a real coupon to reference.

## Out of Scope

- Free trials (explicitly excluded per product policy)
- Annual plan with 20% discount
- Dynamic "Most athletes choose this" badge
- Apple/Google Pay priority UI above CTA (already auto-enabled by Stripe)
- Sending recovery emails (capture-only confirmed earlier)

## Files Touched

- `src/pages/Checkout.tsx` (edit)
- `supabase/functions/create-checkout/index.ts` (edit)
- `stripe--create_coupon` tool call for `RESUME10`

## Success Criteria

- Demo user landing on `/checkout` never sees a plan picker — they see "Reserving your system…" then Stripe in ≤1 click.
- Stripe session includes automatic tax (with graceful fallback), billing address auto, guarantee metadata. **No trial.**
- Returning abandoned demo user sees urgency banner with `RESUME10` auto-applied.
- Non-demo `/checkout` traffic keeps existing 3-tier UX untouched.
