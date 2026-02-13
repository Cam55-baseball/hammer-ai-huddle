

# Fix Scout/Coach Game Plan View + Auth Routing

## Root Cause Analysis

Three bugs are causing scouts and coaches to see the player Game Plan instead of their dedicated review-based view:

### Bug 1: Auth.tsx role query missing `status: 'active'` filter (line 107-111)
The login flow checks `user_roles` without filtering by `status: 'active'`. This means:
- A scout whose application is pending or whose role is inactive still passes `hasRole = true`
- They get routed to `/scout-dashboard` or `/dashboard` prematurely before approval completes

### Bug 2: Auth.tsx ignores the `coach` role entirely (line 150)
After login, the code only checks `isScout` for routing. Coaches are never detected and always fall through to `/dashboard` (the player dashboard). They should be routed to `/coach-dashboard`.

### Bug 3: Dashboard.tsx only shows ScoutGamePlanCard for scouts, not coaches (line 342)
The conditional `isScout && !isOwner && !isAdmin` excludes coaches. Coaches with the `coach` role land on `/dashboard` (due to Bug 2) and then see the standard player `GamePlanCard` instead of `ScoutGamePlanCard`.

---

## Fix Plan

### 1. Auth.tsx -- Add `status: 'active'` filter and coach routing

**Role query fix** (line 107-111): Add `.eq('status', 'active')` to the `user_roles` query so only approved/active roles count during the onboarding check.

**Coach routing** (around line 150): After checking for scout, also check for coach role and route to `/coach-dashboard`.

```
// Updated role check
const isScout = rolesCheck.data?.some((r: any) => r.role === 'scout');
const isCoach = rolesCheck.data?.some((r: any) => r.role === 'coach');

if (state?.returnTo) {
  // existing returnTo logic
} else if (isScout) {
  navigate("/scout-dashboard", { replace: true });
} else if (isCoach) {
  navigate("/coach-dashboard", { replace: true });
} else {
  navigate("/dashboard", { replace: true });
}
```

### 2. Dashboard.tsx -- Include coaches in ScoutGamePlanCard conditional

**Line 342**: Change the guard from `isScout && !isOwner && !isAdmin` to `(isScout || isCoach) && !isOwner && !isAdmin`.

This requires:
- Destructuring `isCoach` from `useScoutAccess()` (already exported by the hook)
- Updating the conditional to include coaches

### 3. useScoutAccess.ts -- Already correct (no changes needed)

The hook already filters by `.eq('status', 'active')` and returns both `isScout` and `isCoach`. No changes required here.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add `.eq('status', 'active')` to role query; add coach routing after scout check |
| `src/pages/Dashboard.tsx` | Destructure `isCoach` from `useScoutAccess`; update ScoutGamePlanCard guard to include coaches |

**Total**: 2 files modified, 0 new files, 0 database changes

---

## What Does NOT Change

- `useScoutAccess` hook (already correct)
- `ScoutGamePlanCard` component (works for both roles)
- `useScoutGamePlan` hook (already role-agnostic)
- Scout/Coach dashboard pages (separate pages, unaffected)
- Subscription logic
- Any Stripe or backend configuration

---

## Blank Preview Note

The preview is currently rendering correctly (the Index/landing page loads fine). The blank screen the user experienced was likely a transient build issue that has since resolved. No `vite.config.ts` or security header changes are needed.
