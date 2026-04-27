## Phase 14 — Post-Purchase UX + Safe Owner Bypass

Single-file change to `src/pages/BuildAccessGate.tsx`. No backend, RLS, webhook, or table changes.

### 1. Owner Bypass (safe, client-side preview only)

- Import `useOwnerAccess` (already exists at `src/hooks/useOwnerAccess.ts`).
- In the access-check `useEffect`, after auth settles:
  - If `isOwner === true`, short-circuit: `setAllowed(true); setChecking(false);` and skip `hasAccess()` entirely.
  - Otherwise run existing `hasAccess(user.id, buildId)` flow unchanged.
- Wait for both `authLoading` and `useOwnerAccess`'s `loading` to be false before deciding, to avoid a flash of "Access denied" for the owner.
- No writes to `user_build_access`. No analytics calls. No RLS impact (RLS still enforced server-side; owner bypass is purely a UI gate skip — owner already has elevated read rights via existing role).

### 2. UX Dead-End Fix (allowed === true branch)

Replace the bare "Content coming soon" with the same minimal `Wrap` layout plus action buttons:

- Heading: capitalized `buildType` (kept).
- Text: "Content coming soon" (kept).
- Subtext: `buildId` in muted mono (kept, optional).
- If `isOwner`, render a small badge above the heading: **"Owner Preview Mode"** (subtle muted pill, no heavy styling).
- Buttons (stacked vertically, small gap, using existing shadcn `Button`):
  1. Primary: **"Back to Dashboard"** → `navigate('/dashboard')`
  2. Secondary (`variant="outline"`): **"My Purchases"** → `navigate('/purchases')` — since that route does not currently exist in the app, the handler falls back to `/dashboard` (we will simply route to `/dashboard` for now, keeping the label per spec; no new pages added this phase).

Decision: To strictly honor "no new pages" and avoid a 404, the "My Purchases" button will navigate to `/dashboard` as the fallback. Label remains "My Purchases" per spec; behavior is the safe fallback the spec allows.

### 3. What stays untouched

- `webhook` logic, `purchases` table, `user_build_access` writes, RLS policies, `hasAccess()` implementation, monetization, analytics.

### Technical details

File: `src/pages/BuildAccessGate.tsx`

- New imports: `Button` from `@/components/ui/button`, `useOwnerAccess` from `@/hooks/useOwnerAccess`.
- Effect dependencies extend to include `isOwner` and owner-loading state.
- Render order in the allowed `Wrap`:
  1. `{isOwner && <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">Owner Preview Mode</span>}`
  2. `<h1>` buildType
  3. "Content coming soon"
  4. buildId mono subtext
  5. Vertical button stack (`flex flex-col gap-2 pt-2`)

### Outcome

- Real purchasers: see actionable buttons instead of a dead end.
- Owner: instant access to any build, clearly labeled "Owner Preview Mode", with zero impact on payments, access tracking, or security.
