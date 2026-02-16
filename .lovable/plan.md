
# Fix: Scout/Coach Game Plan View + Loading Guard

## Problem

Two bugs cause scouts and coaches to see the player Game Plan instead of the ScoutGamePlanCard:

1. **Missing `isCoach` check**: Dashboard line 342 only checks `isScout`, so coaches always get the player view
2. **Missing `scoutLoading` guard**: Dashboard line 298 does not wait for the role query to finish before rendering -- the component renders while `isScout`/`isCoach` are still `false`, showing the player Game Plan

The blank preview screen is NOT reproducible -- the app loads correctly. This was likely a transient build/cache issue.

---

## Fix 1: Add `scoutLoading` to the Loading Guard

**File**: `src/pages/Dashboard.tsx`, line 298

Change:
```
if (authLoading || loading || subLoading) {
```
To:
```
if (authLoading || loading || subLoading || scoutLoading) {
```

This prevents the dashboard from rendering until the scout/coach role check completes, eliminating the flash of the wrong Game Plan view.

---

## Fix 2: Include `isCoach` in the Game Plan Conditional

**File**: `src/pages/Dashboard.tsx`, line 342

Change:
```
{isScout && !isOwner && !isAdmin ? (
```
To:
```
{(isScout || isCoach) && !isOwner && !isAdmin ? (
```

This also requires destructuring `isCoach` from the `useScoutAccess` hook on line 39.

Change line 39 from:
```
const { isScout, loading: scoutLoading } = useScoutAccess();
```
To:
```
const { isScout, isCoach, loading: scoutLoading } = useScoutAccess();
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | 3 line changes: add `isCoach` destructure, add `scoutLoading` to guard, add `isCoach` to conditional |

**Total**: 1 file, 3 line edits, 0 database changes, 0 new files

---

## What Does NOT Change

- `useScoutAccess` hook (already returns `isCoach` and `loading`)
- `ScoutGamePlanCard` component (already works for both roles)
- Scout/Coach dashboard pages
- Any backend or database logic
- Player Game Plan behavior

---

## Why This Fixes It

- **Before**: A coach logs in, `scoutLoading` is `true` but the dashboard renders anyway because it is not in the guard. `isCoach` is `false` (still loading), so the player Game Plan renders. Even after `isCoach` resolves to `true`, the conditional on line 342 never checks it.
- **After**: Dashboard waits for role check to complete (`scoutLoading` in guard). Once loaded, `isCoach === true` triggers the `ScoutGamePlanCard`. No role leakage, no flash, no stale state.
