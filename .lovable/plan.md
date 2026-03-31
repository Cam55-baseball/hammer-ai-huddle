

# Fix: Player Intelligence Redirecting to Dashboard

## Problem
The Coach Command Center (`/coach-command`) redirects to `/dashboard` before the coach role check finishes loading.

**Root cause:** Line 22 of `CoachCommandCenter.tsx` checks `!authLoading && (!user || !isCoach)`, but `useScoutAccess` has its own separate `loading` state. When auth finishes loading, `isCoach` is still `false` (default) because the role query hasn't completed yet — so the redirect fires immediately.

## Fix

**File:** `src/pages/CoachCommandCenter.tsx`

Add the `loading` state from `useScoutAccess` to the guard:

```typescript
// Line 18: destructure loading
const { isCoach, loading: roleLoading } = useScoutAccess();

// Line 22: wait for BOTH auth AND role loading to finish
useEffect(() => {
  if (!authLoading && !roleLoading && (!user || !isCoach)) {
    navigate('/dashboard');
  }
}, [user, authLoading, roleLoading, isCoach, navigate]);
```

Also update the loading skeleton check (line 41) to include `roleLoading`:
```typescript
if (authLoading || roleLoading || isLoading) {
```

One file, three lines changed.

