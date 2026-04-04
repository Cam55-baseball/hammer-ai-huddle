

# Auth Stability — Stabilization Guard + Remaining Redirect Fixes

## Problem
1. **No stabilization window**: Even with `!user && !session`, a redirect can fire in the same render tick that `loading` flips to `false`, before React has committed the auth state.
2. **5 pages still use `!user` alone** (no `session` check): `HelpDesk`, `SelectUserRole`, `MyFollowers`, `ScoutApplicationPending`, `SelectModules`, `Pricing`, `PickoffTrainer`.
3. **Activity edit context**: Activities are edited via dialogs inside `GamePlanCard` on the Dashboard page — there are no separate `/game-plan/activity/:id` routes. The fix is ensuring the Dashboard itself never redirects during token refresh, which the stabilization guard solves.

## Changes

### 1. `src/contexts/AuthContext.tsx` — Add `isAuthStable` flag

Add a derived `isAuthStable` boolean to the context. It starts `false` and becomes `true` one tick after `loading` becomes `false`:

```typescript
const [isAuthStable, setIsAuthStable] = useState(false);

useEffect(() => {
  if (!loading) {
    const timeout = setTimeout(() => setIsAuthStable(true), 0);
    return () => clearTimeout(timeout);
  } else {
    setIsAuthStable(false);
  }
}, [loading]);
```

Expose `isAuthStable` in the context type and provider value.

### 2. All pages with auto-redirects — Use stabilized guard

Every page that auto-redirects to `/auth` gets the same pattern:

```typescript
const { user, session, loading, isAuthStable } = useAuth();

useEffect(() => {
  if (!loading && isAuthStable && !user && !session) {
    navigate("/auth", { replace: true });
  }
}, [loading, isAuthStable, user, session, navigate]);
```

Pages to update:

| Page | Current guard | Fix |
|------|--------------|-----|
| `Dashboard.tsx` | `!user && !session` | Add `isAuthStable` |
| `Profile.tsx` | `!user && !session` | Add `isAuthStable` |
| `ProfileSetup.tsx` | `!user && !session` | Add `isAuthStable` |
| `AnalyzeVideo.tsx` | `!user && !session` | Add `isAuthStable` |
| `HelpDesk.tsx` | `!user` only | Add `session` + `isAuthStable` |
| `SelectUserRole.tsx` | `!user` only | Add `session` + `isAuthStable` |
| `MyFollowers.tsx` | `!user` only | Add `session` + `isAuthStable` |
| `ScoutApplicationPending.tsx` | `!user`, no loading guard | Add `loading` + `session` + `isAuthStable` |
| `SelectModules.tsx` | `!user` only | Add `session` + `isAuthStable` |
| `Pricing.tsx` | `!user` only | Add `session` + `isAuthStable` |
| `PickoffTrainer.tsx` | `!user` (JSX Navigate) | Convert to `useEffect` guard with full pattern |

### 3. Route persistence — Not applicable

Activity editing uses dialogs within the Dashboard page, not separate routes. The stabilization guard on Dashboard is the fix — it prevents the Dashboard from unmounting (which would close dialogs) during token refresh. No URL-based activity routes or sessionStorage needed.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `isAuthStable` state + expose in context |
| `src/hooks/useAuth.ts` | Already re-exports context (no change needed) |
| `src/pages/Dashboard.tsx` | Add `isAuthStable` to guard |
| `src/pages/Profile.tsx` | Add `isAuthStable` to guard |
| `src/pages/ProfileSetup.tsx` | Add `isAuthStable` to guard |
| `src/pages/AnalyzeVideo.tsx` | Add `isAuthStable` to guard |
| `src/pages/HelpDesk.tsx` | Add `session` + `isAuthStable` to guard |
| `src/pages/SelectUserRole.tsx` | Add `session` + `isAuthStable` to guard |
| `src/pages/MyFollowers.tsx` | Add `session` + `isAuthStable` to guard |
| `src/pages/ScoutApplicationPending.tsx` | Add `loading` + `session` + `isAuthStable` to guard |
| `src/pages/SelectModules.tsx` | Add `session` + `isAuthStable` to guard |
| `src/pages/Pricing.tsx` | Add `session` + `isAuthStable` to guard |
| `src/pages/PickoffTrainer.tsx` | Convert to `useEffect` guard with full pattern |

