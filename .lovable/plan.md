

## Plan — Make the Owner Rankings Visibility Toggle Actually Hide Rankings

### Root cause
The Owner Dashboard writes `app_settings.rankings_visible = { enabled: false }` correctly, but **nothing in the app reads that flag** outside the toggle's own state. Result:

- `src/pages/Rankings.tsx` always renders.
- `src/components/AppSidebar.tsx` always shows the Rankings nav link.
- `src/App.tsx` always mounts the `/rankings` route.

Owners (and admins) should always see Rankings regardless. Everyone else must respect the flag in real time.

RLS already allows any authenticated user to `SELECT` from `app_settings`, so no DB changes are needed.

---

### Implementation

#### 1. New shared hook — `src/hooks/useRankingsVisibility.ts`
Single source of truth used by sidebar, route guard, and page.

- Fetches `app_settings.setting_value.enabled` for `setting_key = 'rankings_visible'` once on mount.
- Defaults to `true` if row missing or query errors (fail-open for owners' first deploy; still overridden by the toggle when set).
- Subscribes to realtime `postgres_changes` on `app_settings` filtered to `setting_key=eq.rankings_visible` so toggling in the Owner Dashboard immediately propagates to all open clients (matches the existing realtime patterns in `Rankings.tsx`).
- Returns `{ visible: boolean, loading: boolean }`.

#### 2. Hide the sidebar link — `src/components/AppSidebar.tsx`
- Call `useRankingsVisibility()` and `useAdminAccess()` (already imported via existing hooks).
- In `mainNavItems`, replace the unconditional Rankings entry with:
  ```
  ...((rankingsVisible || isOwner || isAdmin) ? [{ title: t('navigation.rankings'), url: "/rankings", icon: Trophy }] : []),
  ```
- While `loading` is true, omit the link to avoid a flicker for hidden users.

#### 3. Guard the route/page — `src/pages/Rankings.tsx`
- At the top of the component, call `useRankingsVisibility()`, `useOwnerAccess()`, `useAdminAccess()`.
- If `!visible && !isOwner && !isAdmin` → render a clean "Rankings are temporarily unavailable" card inside `DashboardLayout` (no redirect — avoids loops if a user has the URL bookmarked) and skip the data fetch entirely (early return before the `useEffect`s that hit `mpi_scores`).
- While any of the three checks are loading, render the existing `loading` skeleton.

#### 4. Wire the Owner Dashboard toggle to push instantly
`src/pages/OwnerDashboard.tsx` already updates the row. No code change needed — the new realtime subscription in the hook will react automatically. Verify the existing update succeeds (it does, per RLS).

---

### Files

**New**
- `src/hooks/useRankingsVisibility.ts`

**Edited**
- `src/components/AppSidebar.tsx` — conditional Rankings link
- `src/pages/Rankings.tsx` — visibility guard + early return for hidden non-staff users

**Not touched**
- `src/pages/OwnerDashboard.tsx` (toggle already writes correctly)
- `src/App.tsx` (route stays mounted; the page itself gates access — owners/admins still need it)
- DB schema, RLS policies, edge functions, Stripe

---

### Verification
1. Owner toggles Rankings OFF → within ~1s every other open client's sidebar removes the Rankings link and `/rankings` shows the "temporarily unavailable" card.
2. Owner and Admin still see the link and full Rankings page when hidden.
3. Owner toggles back ON → link reappears and page renders for all users without reload.
4. Direct navigation to `/rankings` while hidden (non-staff) shows the unavailable card, never the leaderboard data, and triggers no `mpi_scores` query (verify via Network tab).
5. First-time load with no `app_settings` row → defaults to visible (no regression for fresh installs).
6. Coach / Scout / Player roles all respect the flag.

