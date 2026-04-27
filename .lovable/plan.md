## Phase 13 — Purchase Delivery + Access Unlock

Closes the monetization loop: paid users immediately get access to what they bought. No changes to ranking (Phase 6), monetization eligibility (Phase 7), checkout (Phase 11), or webhook recording (Phase 12) — this phase only adds **access grants** on top of the existing `purchases` row.

---

### Architecture

```text
Stripe checkout.session.completed
        │
        ▼
stripe-webhook (existing)
   └─ handleBuildPurchase
        ├─ INSERT purchases               (Phase 12, unchanged)
        └─ INSERT user_build_access       ← NEW (Phase 13, idempotent)
                │
                ▼
        public.user_build_access
                │
   ┌────────────┴────────────┐
   ▼                         ▼
Success page             Future protected
"Access Your Purchase"   routes (/program/:id,
button → route by type   /bundle/:id, /consultation/:id)
                              │
                              ▼
                         hasAccess(userId, buildId) gate
```

---

### Files

**New**
1. Migration: `public.user_build_access` table + RLS.
2. `src/lib/userBuildAccess.ts` — `hasAccess`, `getUserBuilds`.

**Edited**
3. `supabase/functions/stripe-webhook/index.ts` — after the `purchases` insert in `handleBuildPurchase`, also insert into `user_build_access` (only when `userId` is present; idempotent on `(user_id, build_id)`).
4. `src/pages/Success.tsx` — when purchase loads and user is logged in, show "Access Your Purchase" button routing by `build_type`.
5. `src/pages/owner/BuildLibrary.tsx` — small owner-only "View Buyers" button (`console.log` for now).

No new edge function. No new routes registered (placeholder route handlers are out of scope per "no UI overbuild"; the Success page links route to paths that will be implemented in a later phase).

---

### 1. Migration — `user_build_access`

```sql
create table public.user_build_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id text not null,
  build_type text not null check (build_type in ('program','bundle','consultation')),
  granted_at timestamptz not null default now(),
  unique (user_id, build_id)
);

alter table public.user_build_access enable row level security;

-- Users can read their own access rows.
create policy "Users read own access"
on public.user_build_access for select to authenticated
using (user_id = auth.uid());

-- Owners can read all access rows (for "View Buyers").
create policy "Owners read all access"
on public.user_build_access for select to authenticated
using (public.has_role(auth.uid(), 'owner'));

-- No client INSERT/UPDATE/DELETE policies → only the service role (webhook) writes.
```

UNIQUE `(user_id, build_id)` makes webhook re-delivery safe.

### 2. Webhook extension

In `handleBuildPurchase`, after the existing `purchases.insert(...)` block, add:

```ts
if (userId) {
  const { error: accessErr } = await supabaseClient
    .from('user_build_access')
    .insert({ user_id: userId, build_id: buildId, build_type: buildType });

  if (accessErr) {
    if (accessErr.code === '23505' || accessErr.message?.includes('duplicate')) {
      logStep('Access already granted (duplicate)', { userId, buildId });
    } else {
      logStep('Access grant failed', { message: accessErr.message });
    }
  } else {
    logStep('Build access granted', { userId, buildId, buildType });
  }
}
```

Notes:
- `userId` comes from `session.metadata.user_id` (already set by `create-build-checkout`).
- If `userId` is missing (e.g., guest checkout), only `purchases` is recorded; access can be reconciled later by email. Out of scope here.

### 3. `src/lib/userBuildAccess.ts`

```ts
import { supabase } from '@/integrations/supabase/client';

export async function hasAccess(userId: string, buildId: string): Promise<boolean> {
  if (!userId || !buildId) return false;
  const { data, error } = await supabase
    .from('user_build_access')
    .select('id')
    .eq('user_id', userId)
    .eq('build_id', buildId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getUserBuilds(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_build_access')
    .select('build_id, build_type, granted_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });
  return error ? [] : (data ?? []);
}
```

RLS guarantees users only see their own rows even if `userId` is spoofed client-side.

### 4. Success page upgrade

In `src/pages/Success.tsx`, when `status === 'ready'` and `purchase` is present:

- Compute target route from `purchase.build_id` + `build_type`:
  - `program` → `/program/${build_id}`
  - `bundle`  → `/bundle/${build_id}`
  - `consultation` → `/consultation/${build_id}`
- Render a primary "Access Your Purchase" button alongside the existing "Back to Dashboard" / "View Builds" buttons.
- Keep existing delivery-message copy unchanged.

No route handlers added in this phase (those targets will 404 until a later phase wires the actual content). This matches the brief: "No dashboards. No messaging. No scheduling yet."

### 5. Owner "View Buyers" (light)

In `src/pages/owner/BuildLibrary.tsx`, next to each build's "Sell / Share" button add an owner-only secondary button:

```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={async () => {
    const { data } = await supabase
      .from('user_build_access')
      .select('user_id, granted_at')
      .eq('build_id', b.id)
      .order('granted_at', { ascending: false });
    console.log('[Buyers]', b.id, data);
  }}
>
  View Buyers
</Button>
```

RLS "Owners read all access" allows this query. UI rendering of buyer lists is intentionally deferred.

---

### Out of scope (later phases)
- `/program/:id`, `/bundle/:id`, `/consultation/:id` content/route handlers.
- Buyer email reconciliation (when `metadata.user_id` was missing at checkout time).
- Owner buyers dashboard UI, messaging, scheduling.
- Refund-driven access revocation.

---

### Outcome
Webhook now writes both `purchases` and `user_build_access` on every paid build. The Success page surfaces an "Access Your Purchase" CTA, and any future protected route can gate via `hasAccess(userId, buildId)`. The full pay → record → grant → access loop is closed.
