## Audit results

**Checkout type:** Stripe Checkout (hosted), `mode: 'subscription'`.

**Current flow:** Demo CTA → `/checkout?prefill=...` → user clicks "Proceed to Payment" → `create-checkout` edge fn → Stripe-hosted page → `/checkout?status=success` → 800ms toast → `/dashboard`.

**Steps from CTA → payment:** 3 screens (upgrade page → checkout page button → Stripe page).

**Disconnect:** `/checkout` ignores `prefill / reason / gap / pct / from` params; reads `tier` from `location.state` or localStorage. Demo context is lost between upgrade page and Stripe.

**Metadata to Stripe:** only `{ user_id, tier, sport }`. No sim, severity, gap, pct, from.

**Pricing:** real tiers are $200 / $300 / $400 per month — not $29 / $39. Per your direction, all demo conversions recommend **The Golden 2Way ($400/mo)**.

**Stripe Checkout payment methods:** wallets (Apple Pay / Google Pay / Link) auto-enable when the Dashboard payment method settings include them. We are not disabling them in code, so they show automatically. We will additionally pass `payment_method_types` left unset (default = automatic) and `customer_email` for prefill, and we will pass full demo metadata.

**No abandonment tracking, no A/B price assignment, no risk-reversal copy, no post-checkout continuity.**

---

## Plan

### Phase 1 — Contextualized checkout (Checkout.tsx)

- Read `prefill, reason, gap, pct, from, sim` from `useSearchParams`.
- If `prefill` is present and no explicit tier in state, default `selectedTier = 'golden2way'`.
- Render a top context block above the existing card when `from === 'demo'`:
  - Eyebrow: `You're unlocking your {SIM_LABEL} system`
  - 3 chips: `Fix your {gap}` · `Close your {severity} performance gap` · `Projected: {projected}`
  - Pulls labels from `src/demo/prescriptions/conversionCopy.ts` so wording matches the demo result exactly.

### Phase 2 — Single recommended plan

- Replace tier-config block with a single recommended card:
  - Header: **The Golden 2Way** + badge "Recommended for you based on your result"
  - Subtext: "Most athletes who hit your gap choose this"
  - Small link below: `See other options` → expands the existing Pitcher / 5Tool / Golden cards inline (collapsed by default).
- Selecting an alternate updates `selectedTier` state; default stays Golden 2Way.

### Phase 3 — Price presentation

- Price block becomes: `$400 / month` · `Cancel anytime`
- Directly under: `Less than $14 per day to fix this gap` (computed `Math.ceil(price/30)`).
- Replace existing "Total per month" muted footer.

### Phase 4 — Risk reversal

- New block under the primary CTA:
  - Shield icon + **7-day performance guarantee**
  - "If you don't see measurable progress, we'll refund you."

### Phase 5 — Stripe checkout optimization (`create-checkout` edge fn)

- Accept new optional body fields: `simId, severity, gap, pct, from, abVariant`.
- Add to `checkoutMetadata`: `sim_id, severity, gap, pct, from_slug, ab_variant`.
- Pass `customer_email` (already does).
- Add `payment_method_collection: 'always'` and leave `payment_method_types` unset so Stripe auto-includes wallets + Link based on Dashboard settings.
- Add `subscription_data: { metadata: checkoutMetadata }` so the metadata persists on the subscription, not just the session.
- Add `client_reference_id: user.id` (helps webhook + dashboards).
- Success URL keeps params: `success_url: ${origin}/checkout?status=success&sim=${simId}&from=${from}` (so post-checkout redirect can preserve context).

### Phase 6 — Post-checkout continuity

- On `status=success`, instead of `/dashboard`, redirect to:
  - `/select-modules?context=${simId}&from=demo`
- Add a one-time momentum banner at the top of `SelectModules.tsx`:
  - "Building your system based on your {gap}…" with a 2.5s spinner-progress, then the banner becomes a static success strip: "Your {SIM_LABEL} system is ready to configure."
- Banner reads context from query string; dismissible; no schema change.

### Phase 7 — Abandonment capture (no email send yet)

- New table `checkout_attempts` (RLS: insert by authenticated user for own row; select restricted to owner/admin):
  - `id uuid pk`, `user_id uuid`, `email text`, `tier text`, `sim_id text`, `severity text`, `gap text`, `pct int`, `from_slug text`, `ab_variant text`, `started_at timestamptz default now()`, `completed_at timestamptz null`, `stripe_session_id text null`.
- `Checkout.tsx` inserts a row when `handleCreateCheckout` is invoked (after edge fn returns the session url, so we can store `stripe_session_id`).
- On `status=success`, update the matching row's `completed_at`.
- Rows older than 30 minutes with `completed_at IS NULL` are eligible for future recovery emails. We don't send anything now per your decision; data is captured for later.

### Phase 8 — A/B test (existing tiers, not invented prices)

- Per your direction we keep real prices. The A/B becomes:
  - **Group A:** Recommended = Golden 2Way ($400)
  - **Group B:** Recommended = 5Tool Player ($300) with same urgency framing
- Assignment: deterministic by `user.id` hash → `abVariant: 'A' | 'B'`. Stored in `localStorage('demo_ab_variant')` for stability across reloads.
- Variant passed to checkout edge fn and persisted to `checkout_attempts.ab_variant` + Stripe metadata.
- A new admin-readable view `checkout_ab_summary` (SQL view) aggregates `ab_variant → started, completed, conversion_rate, revenue` for later analysis.

---

## Files to change

- `src/pages/Checkout.tsx` — contextual header, single-plan UI, daily price, guarantee, post-success route.
- `src/pages/demo/DemoUpgrade.tsx` — primary CTA forwards `simId, severity, gap, pct, from, sim` query params to `/checkout` and forces `tier=golden2way` (or A/B variant).
- `src/pages/SelectModules.tsx` — momentum banner.
- `supabase/functions/create-checkout/index.ts` — accept + persist metadata, success_url params.
- `src/lib/demoAbVariant.ts` (new) — deterministic variant assignment hook.
- DB migration:
  - `checkout_attempts` table + RLS
  - `checkout_ab_summary` view
- `src/integrations/supabase/types.ts` regenerates automatically.

## Out of scope

- Sending actual abandonment emails (deferred per your direction).
- Creating new $29 / $39 products in Stripe.
- Switching to Stripe Elements (hosted Checkout retained).
