
Root cause

- This is not a missing-role database issue. The runtime `user_roles` request for your current account returned `[{ "role": "coach" }]`.
- The replay also shows the Coach Command Center rendering briefly (`Player Intelligence Command Center` + `No linked players found`), so the page does load.
- The real problem is client-side auth/access state drift:
  1. `useAuth()` is not shared globally; every caller creates its own auth listener and local state.
  2. `CoachCommandCenter`, `useScoutAccess`, `useCoachUDL`, `DashboardLayout`, and `AppSidebar` can all see different auth timing.
  3. `useScoutAccess` still doesn’t wait for auth to fully settle before deciding coach access.
- Result: the sidebar can show the coach-only module, the page can mount briefly, and then the route guard still decides “not a coach” and kicks you back to `/dashboard`.

Implementation plan

1. Centralize auth state
- Refactor `src/hooks/useAuth.ts` into a shared auth provider/context while keeping the same `useAuth()` API.
- Wrap the app once in `src/main.tsx` so every component/hook reads the same `user`, `session`, and `loading`.

2. Fix role-access gating
- Update `src/hooks/useScoutAccess.ts` to use shared `authLoading` + `session`, and only query roles after auth is fully resolved.
- Keep `loading=true` until that check finishes.
- Align `useAdminAccess.ts` to the same pattern, and keep `useOwnerAccess.ts` consistent.

3. Fix the Coach Command route guard
- Update `src/pages/CoachCommandCenter.tsx` so it does not silently bounce during unresolved auth/access states.
- Render loading until both auth and coach access are settled.
- After settlement, render the page for coaches; otherwise show a clear access state or only then redirect intentionally.

4. Verify the full coach flow
- Confirm clicking `Player Intelligence` keeps the app on `/coach-command`.
- Confirm the `udl-coach-overview` request fires after auth/access settle.
- Confirm the page shows either linked-player cards or the existing empty state, plus alert scan functionality.

Files likely touched

- `src/hooks/useAuth.ts`
- `src/main.tsx`
- `src/hooks/useScoutAccess.ts`
- `src/hooks/useAdminAccess.ts`
- `src/hooks/useOwnerAccess.ts`
- `src/pages/CoachCommandCenter.tsx`

Technical details

- No backend/schema change is needed; this is a frontend auth/guard bug.
- The earlier fixes addressed symptoms, but not the deeper issue that multiple independent `useAuth()` instances can disagree about login state.
- Once auth is shared, the sidebar, route guard, and UDL data hooks will all evaluate the same session and stop fighting each other.
