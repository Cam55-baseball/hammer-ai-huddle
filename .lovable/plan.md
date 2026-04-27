## Phase 13.5 — Access Enforcement

Complete Phase 13 by gating purchased build routes. Paid users see a placeholder; everyone else sees a denial message. No styling, no content, no data fetch beyond the access check.

---

### Files

**New (1 component, reused for all 3 routes)**
- `src/pages/BuildAccessGate.tsx` — generic access-gated placeholder. Reads `:id` from params, current user from `useAuth()`, calls `hasAccess(user.id, buildId)`. Accepts a `buildType` prop for the headline.

**Edited**
- `src/App.tsx` — register 3 lazy routes:
  - `/program/:id` → `<BuildAccessGate buildType="program" />`
  - `/bundle/:id` → `<BuildAccessGate buildType="bundle" />`
  - `/consultation/:id` → `<BuildAccessGate buildType="consultation" />`

No new edge function. No new tables. Reuses existing `hasAccess()` helper and RLS from Phase 13.

---

### `BuildAccessGate.tsx` behavior

```text
mount
  ├─ authLoading? → "Loading..."
  ├─ no user?     → "You must sign in to access this content"
  ├─ no buildId?  → "Invalid link"
  └─ hasAccess(user.id, buildId)
        ├─ checking → "Checking access..."
        ├─ true     → "Content coming soon" (+ buildType label, + buildId)
        └─ false    → "You do not have access to this content"
```

Minimal markup: a centered `<div>` with one heading and one paragraph. No cards, no buttons, no styling beyond default Tailwind text utilities.

---

### Server-safety

- `userId` is read from `useAuth()` (Supabase session), never from URL or props.
- `hasAccess()` queries `user_build_access` with RLS policy `user_id = auth.uid()`, so even a spoofed client-side `user.id` cannot return another user's row — Postgres enforces it.
- No write paths added. The gate is read-only.

---

### Out of scope
- Real content rendering for programs / bundles / consultations.
- Loading the build definition (title, modules, etc.).
- Refund-driven revocation.
- Owner-bypass (owners currently must purchase to view; their `View Buyers` flow is unchanged).

---

### Outcome
After this phase, the routes referenced by the Success page's "Access Your Purchase" button resolve to real pages. Paid users land on a "Content coming soon" placeholder; unpaid users (including direct URL guessers) are blocked. The monetization loop — pay → record → grant → **enforce** — is fully closed.
