

# Fix: Save Session E2E

## Problem

After saving a session, the "My Sessions" library doesn't refresh because `handleSaveSession` never invalidates the React Query cache for `royal-timing-sessions`. The toast says "Session saved" but the library still shows the old count.

## Fix

**File: `src/components/royal-timing/RoyalTimingModule.tsx`**

1. Import `useQueryClient` from `@tanstack/react-query`
2. Get `queryClient` instance via `useQueryClient()`
3. After successful save (line 304, after the toast), call `queryClient.invalidateQueries({ queryKey: ['royal-timing-sessions'] })` to refresh the library
4. Add the same invalidation in `handleSubmit` if not already present
5. Add `queryClient` to the `useCallback` dependency arrays

## Technical Detail

The library uses `useQuery({ queryKey: ['royal-timing-sessions'] })` which is only re-fetched when invalidated. Currently, only `deleteSession` and `duplicateSession` mutations in the hook call `invalidateQueries`. The save flow in the module component bypasses the hook entirely and writes directly to the database without triggering a cache refresh.

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/RoyalTimingModule.tsx` | Add query cache invalidation after save/submit |

