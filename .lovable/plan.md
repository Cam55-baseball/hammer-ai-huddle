

# Fix: Coach Command Center Race Condition Redirect

## Problem
`useScoutAccess` sets `loading = false` when `user` is `null` on initial mount. When auth resolves and `user` becomes available, the effect re-runs but `loading` stays `false` during the async role query. The `CoachCommandCenter` guard sees `authLoading=false, roleLoading=false, isCoach=false` and redirects before the query completes.

## Fix

**File: `src/hooks/useScoutAccess.ts`**

Add `setLoading(true)` at the top of the `checkAccess` function, before the `if (!user)` check. This ensures that whenever the effect re-runs (e.g. when `user` changes from null to a real user), loading is reset to `true` until the query completes.

```typescript
const checkAccess = async () => {
  setLoading(true);  // <-- Add this line
  
  if (!user) {
    setIsScout(false);
    setIsCoach(false);
    setLoading(false);
    return;
  }
  // ... rest unchanged
};
```

One line added to one file.

