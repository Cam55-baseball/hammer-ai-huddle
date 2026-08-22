# Finish the Owner Bundle Selling System

Today the bundle system is a scaffold: bundles are saved only to the owner's browser (`localStorage`), checkout can only be started by the owner (the checkout function rejects everyone else), and a buyer who does pay lands on a page that says "Content coming soon." Purchases and access grants already write to the database correctly — the missing pieces are storage, a public buying surface, delivery, and owner controls.

## What gets built

### 1. Bundles move out of the browser and into the database
A real `bundles` table replaces `localStorage`, so a bundle exists once, survives device changes, and can be linked to. Each bundle stores: name, description, cover image, price, ordered video list, status (draft or published), and a short URL slug.

Existing local bundles are imported automatically the first time the owner opens the Build Library, so nothing is lost.

### 2. Draft → Publish
A bundle starts as a draft, visible only to the owner. Publishing generates its public link and makes it purchasable. Unpublishing pulls it from sale without affecting anyone who already bought it.

### 3. Public product page — anyone with the link can buy
`/b/:slug` is a public sales page: cover, name, description, price, video list with durations (titles only, no playback), and a Buy button. No account needed to view. Checkout collects the buyer's email; after payment they're prompted to create or sign in to the account that email belongs to, and access lands there automatically.

### 4. Real delivery — the bundle player page
Replaces the "Content coming soon" stub. A purchased bundle opens a proper player: video list in the owner's chosen order, playback, description/notes per video, watched-progress markers, and a "next video" flow. Access is checked server-side against the existing `user_build_access` table.

### 5. Discount codes
Owner creates codes (percent or fixed amount, optional expiry, optional max redemptions, optionally scoped to one bundle). Buyers enter a code on the product page and see the price update before paying; redemption is validated server-side at checkout.

### 6. Manual grant / revoke
From a bundle's detail view the owner can grant access to any user by email without a payment (comps, team deals, refunds handled outside Stripe) and revoke access. Every grant and revoke is logged with who did it and why.

### 7. Sales dashboard
A Sales tab in the Owner Dashboard: total revenue, revenue this month, units sold, and a per-bundle breakdown (views → purchases conversion, revenue, buyer list). Backed by the existing `purchases` table plus a lightweight page-view counter on the public product page.

### 8. Owner clarity pass
The Build Library becomes the single control center: each bundle card shows status (Draft / Live), price, video count, revenue to date, and a copy-link button. A short inline checklist ("add videos → set price → publish → share link") guides a first-time run so the flow is obvious without documentation.

## Technical notes

- **New tables** (all with RLS + explicit GRANTs): `bundles` (owner-writable; `anon`/`authenticated` read restricted to `status = 'published'`), `bundle_discount_codes` (owner-only read/write; validated server-side), `bundle_grants_audit` (owner read), `bundle_page_views` (insert-only counter).
- **`create-build-checkout` is split**: the existing owner-only path stays for testing; a new public `create-bundle-checkout` function takes `{ slug, code? }`, re-reads price and discount **from the database** (never from the client), and creates the Stripe session. Buyer identity comes from Stripe's collected email, or from the validated bearer token when the buyer is already signed in — never from request data.
- **`stripe-webhook`** keeps its current `build_id` handling; it gains email-based deferred grants so a purchase by a not-yet-registered email is claimed on signup.
- **Bundle player** reads video rows through a security-definer function scoped by `user_build_access`, so signed video URLs are never exposed to non-purchasers.
- Owner grant/revoke runs through an edge function using the service role with an owner-role check in code; the client never writes `user_build_access`.

## Verification

Signed-in purchase, signed-out purchase from the public link, discount code applied, manual grant, and revoke will each be exercised end-to-end in the preview, with the persisted `purchases` and `user_build_access` rows inspected to confirm the correct buyer is recorded.
