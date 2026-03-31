

# Fix Dashboard Glitching — Role Query Storm

## Problem

The `useOwnerAccess` hook fires **repeatedly in a loop**, as seen in the console logs (11+ rapid-fire queries for the same user). This causes:
- Network request storms to the database
- UI re-renders / visual glitching on the dashboard
- Wasted bandwidth and degraded performance

**Root cause:** `useOwnerAccess` has `[user, session, authLoading]` as `useEffect` dependencies. The `session` object from `AuthContext` is a new reference on every state update, causing the effect to re-trigger endlessly. Since this hook is imported in **24 files**, the problem multiplies across the app.

`useAdminAccess` and `useScoutAccess` only depend on `[user]` so they're stable, but `useOwnerAccess` is the hot loop.

## Fix

**File: `src/hooks/useOwnerAccess.ts`**

1. Replace `session` dependency with `user?.id` (a stable string primitive). The hook only needs `session` to verify the user is authenticated — but `user` already implies a valid session.
2. Replace `authLoading` guard with a simple `user?.id` check — if auth is loading, `user` is null, so the early return already handles it.
3. Remove verbose console.log statements that are flooding the console.

```typescript
useEffect(() => {
  const checkOwnerRole = async () => {
    if (!user?.id) {
      setIsOwner(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .eq('status', 'active');

      if (error) {
        console.error('[useOwnerAccess] Error:', error);
        setIsOwner(false);
      } else {
        setIsOwner(!!data && data.length > 0);
      }
    } catch (error) {
      console.error('[useOwnerAccess] Exception:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  checkOwnerRole();
}, [user?.id]);  // Stable primitive — no re-render loop
```

One file, one dependency fix. The glitching stops.

## Files

| File | Action |
|------|--------|
| `src/hooks/useOwnerAccess.ts` | **Modify** — change deps from `[user, session, authLoading]` to `[user?.id]`, remove console spam |

