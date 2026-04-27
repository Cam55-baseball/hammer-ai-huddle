## Phase 11 — Stripe Checkout for Owner Builds

Activate real monetization on Phase 10.5 builds. Owner clicks "Sell / Share" on a saved build → Stripe Checkout session → Success page. No DB schema changes, no impact to ranking (Phase 6) or monetization eligibility (Phase 7).

---

### Architecture

```text
BuildLibrary  ──[Sell/Share]──▶  edge fn: create-build-checkout
                                       │  (validates owner, builds Stripe session
                                       │   from BuildItem payload sent by client)
                                       ▼
                                Stripe Checkout (hosted)
                                       │
                          success_url ─┴─ cancel_url
                                  │            │
                               /success     /owner/builds
```

Builds live in `localStorage` (Phase 10.5), so the client sends the full `BuildItem` to the edge function — the function validates shape + price and creates the session. No new tables.

---

### Files

**New**
1. `supabase/functions/create-build-checkout/index.ts` — owner-gated Stripe Checkout session creator for a single `BuildItem`.
2. `src/pages/Success.tsx` — post-payment confirmation page.

**Edited**
3. `src/pages/owner/BuildLibrary.tsx` — add "Sell / Share" button per build that invokes the function and redirects.
4. `src/App.tsx` — register lazy `/success` route.

No edits to ranking, monetization eligibility, builder pages, or storage utility.

---

### 1. Edge function `create-build-checkout`

- Standard CORS + JWT validation against `auth.getUser(token)`.
- Verify caller has `owner` role in `user_roles` (mirrors existing `create-checkout` pattern); reject 403 otherwise.
- Validate request body with Zod:
  ```ts
  { build: { id, type: 'program'|'bundle'|'consultation', name: string(1..200),
             meta: { price?: string|number, videoId?: string }, createdAt: number } }
  ```
- Resolve unit amount (cents):
  - If `meta.price` parses to a positive number → use it (× 100, rounded).
  - Else fall back to a default per type: program $99, bundle $49, consultation $199 (constants at top of file, easy to tune).
- Create Stripe customer lookup by email (reuse pattern from `create-checkout`).
- `stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: { currency: 'usd', unit_amount, product_data: { name: build.name, metadata: { build_id, build_type, video_id } } }, quantity: 1 }], success_url: '${origin}/success?session_id={CHECKOUT_SESSION_ID}&build=${build.id}', cancel_url: '${origin}/owner/builds', metadata: { user_id, build_id, build_type } })`.
- Use `price_data` (not pre-created Stripe products) because builds are owner-defined locally — no per-build Stripe product needed. This is intentional and matches the "no architecture changes later" goal: Phase 12 can swap to real `price` IDs without UI changes.
- Returns `{ url }`.
- `verify_jwt` left at default (validated in code).

### 2. `src/pages/Success.tsx`

- Reads `session_id` and `build` from query string.
- Card with: ✅ "Payment Successful", "Thank you — your purchase is confirmed.", small line "Build ID: {build}", placeholder "Delivery details will follow shortly." 
- Buttons: "Back to Dashboard" → `/dashboard`, "View Builds" → `/owner/builds` (owner only — show conditionally via `useOwnerAccess`).
- No gated content / unlock logic (Phase 12).

### 3. `BuildLibrary.tsx` updates

- Add `Button` "Sell / Share" (with `Send` icon) in each build's `Card`.
- `onClick` handler:
  ```ts
  const { data, error } = await supabase.functions.invoke('create-build-checkout', { body: { build } });
  if (error || !data?.url) { toast({ title: 'Could not start checkout', variant: 'destructive' }); return; }
  window.location.href = data.url;
  ```
- Loading state per-row (disable button, swap label to "Opening…").
- Owner gating already enforced by page-level `useOwnerAccess`.

### 4. `App.tsx`

- `const Success = lazyWithRetry(() => import("./pages/Success"));`
- `<Route path="/success" element={<Success />} />` near other top-level routes.

---

### Secrets / infra
- `STRIPE_SECRET_KEY` — already configured. ✅
- No new secrets required. `STRIPE_WEBHOOK_SECRET` exists but unused this phase (Phase 12 will add a webhook for delivery/unlock).

### Out of scope (Phase 12)
- Webhook → DB write of purchases
- Access control / program unlock / enrollment
- Per-build Stripe Product/Price persistence
- Refunds, customer portal for these one-offs

---

### Outcome
Owner: Build Library → Sell/Share → Stripe Checkout → /success.
Buyer: pays via Stripe, lands on confirmation. Revenue flows; no user-facing exposure of the builder system; ranking + monetization eligibility untouched.
