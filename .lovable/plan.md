## Phase 12 — Stripe Webhook Build Payment Delivery

Extend the existing `stripe-webhook` to handle one-off build purchases, persist them in a new `purchases` table, and surface a meaningful confirmation on `/success`. No impact to ranking (Phase 6), monetization eligibility (Phase 7), or the existing subscription flow.

---

### Architecture

```text
Stripe Checkout (build)
        │
        ▼
checkout.session.completed
        │
        ▼
stripe-webhook (existing, extended)
   ├─ subscription path  → unchanged
   └─ one-off build path → INSERT into public.purchases
                            (build_id, build_type, buyer_email, amount, session_id)
        ▼
/success page
   └─ get-build-purchase edge fn (by session_id)
        └─ returns { build_type, build_name, buyer_email }
              ▼
         Conditional message:
           consultation → "We will contact you"
           program/bundle → "Access will be granted shortly"
```

---

### Files

**New**
1. Migration: create `public.purchases` table + RLS.
2. `supabase/functions/get-build-purchase/index.ts` — auth'd lookup of a purchase by `session_id` for the `/success` page.

**Edited**
3. `supabase/functions/stripe-webhook/index.ts` — extend `handleCheckoutCompleted` to branch on `metadata.build_id`.
4. `supabase/config.toml` — register `get-build-purchase` (`verify_jwt = true`).
5. `src/pages/Success.tsx` — fetch purchase, render type-specific delivery message.

No changes to `create-build-checkout`, `BuildLibrary`, ranking, or monetization code.

---

### 1. `purchases` table (migration)

```sql
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  build_id text not null,
  build_type text not null check (build_type in ('program','bundle','consultation')),
  build_name text,
  buyer_email text not null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  amount_cents integer,
  currency text default 'usd',
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- Buyers can read their own purchases.
create policy "Buyers read own purchases"
on public.purchases for select to authenticated
using (buyer_user_id = auth.uid() or buyer_email = (auth.jwt() ->> 'email'));

-- Owners can read all purchases.
create policy "Owners read all purchases"
on public.purchases for select to authenticated
using (public.has_role(auth.uid(), 'owner'));

-- No client INSERT/UPDATE/DELETE policies → only service role (webhook) writes.
```

`stripe_session_id UNIQUE` → idempotent webhook re-delivery is safe.

### 2. Webhook extension (`stripe-webhook/index.ts`)

In `handleCheckoutCompleted`, branch before the existing subscription path:

```ts
const session = event.data.object as Stripe.Checkout.Session;

// One-off build purchase (Phase 11/12)
if (session.metadata?.build_id) {
  await handleBuildPurchase(session, supabaseClient);
  return;
}

// Existing subscription path — unchanged
if (!session.subscription) return;
// ...existing code
```

New helper:

```ts
async function handleBuildPurchase(
  session: Stripe.Checkout.Session,
  supabaseClient: any
) {
  const buildId   = session.metadata?.build_id ?? '';
  const buildType = session.metadata?.build_type ?? '';
  const userId    = session.metadata?.user_id ?? null;
  const email     = session.customer_details?.email ?? session.customer_email ?? '';
  const name      = session.line_items_data?.[0]?.description ?? null; // best-effort
  if (!buildId || !buildType || !email) {
    logStep("Build purchase missing fields", { buildId, buildType, email });
    return;
  }
  const { error } = await supabaseClient.from('purchases').insert({
    stripe_session_id: session.id,
    build_id: buildId,
    build_type: buildType,
    build_name: name,
    buyer_email: email,
    buyer_user_id: userId,
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? 'usd',
  });
  if (error && !error.message.includes('duplicate')) {
    logStep("Purchase insert failed", { message: error.message });
  } else {
    logStep("Build purchase recorded", { buildId, buildType });
  }
}
```

Existing idempotency on `processed_webhook_events` plus the `stripe_session_id UNIQUE` constraint make replays safe.

### 3. `get-build-purchase` edge function

- `verify_jwt = true`.
- Body: `{ session_id: string }`.
- Validates user via `auth.getUser`, then selects from `purchases` where `stripe_session_id = session_id`. RLS ensures the caller is either the buyer or an owner.
- Returns `{ build_id, build_type, build_name, buyer_email, amount_cents, created_at }` or 404.

Why a function (vs. direct client query): payment confirmations typically arrive 1–3s after redirect. The function will retry up to ~5x with 600ms backoff before returning 404, smoothing the race between Stripe redirect and webhook write.

### 4. Success page updates (`src/pages/Success.tsx`)

- On mount, if `session_id` present, invoke `get-build-purchase`.
- Local `useState` for `{ status: 'loading'|'ready'|'pending'|'error', purchase? }`.
- Render:
  - Loading: spinner + "Confirming your purchase…"
  - Pending (404 after retries): "Your payment was received — confirmation is still processing. Refresh in a moment."
  - Ready:
    - Headline: "Payment Successful"
    - "You purchased: **{build_name}**" (fall back to `Build {build_type}`)
    - Delivery message:
      - `consultation` → "We will contact you shortly to schedule."
      - `program` | `bundle` → "Access will be granted shortly."
- Keep existing buttons (Back to Dashboard / View Builds for owners).

### 5. `supabase/config.toml`

Append:
```toml
[functions.get-build-purchase]
verify_jwt = true
```

(Existing `stripe-webhook` block with `verify_jwt = false` is unchanged.)

---

### Out of scope (Phase 13)
- Actual program unlock / bundle access grants / consultation scheduling
- Owner "Purchases" admin view (data is queryable; UI later)
- Email receipts (Stripe sends its own)
- Refund handling

---

### Outcome
Buyer pays → webhook records purchase → `/success` shows what they bought + a type-specific delivery message. Owner can later query `purchases` for fulfillment. End-to-end loop closed; ready for Phase 13 access grants.