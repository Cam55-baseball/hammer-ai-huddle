

# Fix Scout/Coach Game Plan View -- End-to-End

## Root Cause (Why It Still Doesn't Work)

There are **two distinct bugs** causing scouts and coaches to never see the ScoutGamePlanCard:

### Bug 1: Auth.tsx routes scouts/coaches AWAY from `/dashboard`

After login, the code at line 165-173 sends:
- Scouts to `/scout-dashboard`
- Coaches to `/coach-dashboard`

But the ScoutGamePlanCard lives on `/dashboard` (line 342). So scouts and coaches are routed to their player-management pages and **never land on the page that has the game plan**. They literally cannot see the ScoutGamePlanCard because they're sent to a different URL.

### Bug 2: Dashboard.tsx loading guard ignores `scoutLoading`

Line 298 checks `authLoading || loading || subLoading` but NOT `scoutLoading`. This means if a scout/coach navigates to `/dashboard` manually, the component renders with `isScout=false` and `isCoach=false` (defaults) before the role check finishes. The player GamePlanCard renders immediately, and depending on timing, the correct card may never appear.

---

## Fix Plan

### 1. Auth.tsx -- Route scouts and coaches to `/dashboard`

Change the post-login routing so scouts and coaches go to `/dashboard` (where the ScoutGamePlanCard lives), NOT to their separate management pages. The `/scout-dashboard` and `/coach-dashboard` pages remain accessible via navigation but are not the login landing page.

**Before:**
```
} else if (isScout) {
  navigate("/scout-dashboard", { replace: true });
} else if (isCoach) {
  navigate("/coach-dashboard", { replace: true });
} else {
  navigate("/dashboard", { replace: true });
}
```

**After:**
```
} else {
  // All authenticated users (scouts, coaches, players) go to /dashboard
  // Scouts/coaches see ScoutGamePlanCard; players see GamePlanCard
  navigate("/dashboard", { replace: true });
}
```

### 2. Dashboard.tsx -- Add `scoutLoading` to the loading guard

**Before (line 298):**
```
if (authLoading || loading || subLoading) {
```

**After:**
```
if (authLoading || loading || subLoading || scoutLoading) {
```

This ensures the dashboard waits for the role check to complete before rendering, so the correct game plan card (ScoutGamePlanCard vs GamePlanCard) is shown on first render with no flash.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Remove scout/coach-specific routing -- all users go to `/dashboard` |
| `src/pages/Dashboard.tsx` | Add `scoutLoading` to the loading guard on line 298 |

**Total**: 2 files modified, 0 new files, 0 database changes

---

## What Does NOT Change

- `/scout-dashboard` and `/coach-dashboard` pages still exist and work -- they're for player management (search, follow, activity history)
- `useScoutAccess` hook -- already correct
- `ScoutGamePlanCard` component -- already correct
- The conditional at line 342 -- already correct (`(isScout || isCoach) && !isOwner && !isAdmin`)
- Subscription logic, Stripe, database schema -- all unchanged

---

## Expected Behavior After Fix

1. Scout logs in --> lands on `/dashboard` --> sees ScoutGamePlanCard with player video review checklist
2. Coach logs in --> lands on `/dashboard` --> sees ScoutGamePlanCard with player video review checklist
3. Player logs in --> lands on `/dashboard` --> sees standard GamePlanCard with training tasks
4. No flash of wrong card -- loading skeleton shows until role check completes
5. Scouts/coaches can still navigate to their management pages (`/scout-dashboard`, `/coach-dashboard`) via sidebar/nav

