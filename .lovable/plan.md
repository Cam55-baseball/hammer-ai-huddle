

# Fix: Skip Subscription Check When No Session Exists

## Problem
The `useSubscription` hook calls the `check-subscription` edge function even when the user is on the `/auth` page with no active session. This causes 401 "Auth session missing" errors and a blank screen.

## Fix

**`src/hooks/useSubscription.ts`** — Add an early return in `checkSubscription` right after `getSession()` returns no session, *before* calling `refreshSession()` or `invoke()`. The current code already has this guard but then proceeds to call `refreshSession()` anyway due to the flow structure. We need to ensure the function truly exits early.

Additionally, in the `useEffect`, guard the initial call and polling so they only run when a session exists, and rely on the `SIGNED_IN` auth event to start checking.

### Changes

| File | Change |
|------|--------|
| `src/hooks/useSubscription.ts` | 1. Move the no-session early return **before** `refreshSession()` call. 2. In the `useEffect`, skip `startPolling()` until a `SIGNED_IN` or `TOKEN_REFRESHED` event confirms a session. 3. On `SIGNED_OUT`, also clear `prevModules` to avoid stale comparisons. |

