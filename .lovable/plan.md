

# Final 3 Micro-Fixes — Gold Architecture Completion

## Fix 1: BroadcastChannel Echo Loop Prevention (`useUnifiedDataSync.ts`)

**Problem**: Tab A invalidates → broadcasts → Tab B invalidates → broadcasts back → Tab A invalidates again. Dedup partially protects but is not a guaranteed guard.

**Fix**: Generate a stable `TAB_ID` per hook instance. Tag every broadcast message with `source: TAB_ID`. On receive, ignore messages from self.

- Line 130: Add `const tabIdRef = useRef(crypto.randomUUID());` 
- Line 148: Change broadcast to include `source: tabIdRef.current`
- Line 287: Add guard `if (event.data.source === tabIdRef.current) return`

## Fix 2: Reconciliation Cooldown Reset on Snapshot Change (`useHIESnapshot.ts`)

**Problem**: If the snapshot updates but falls within the 5s cooldown window, reconciliation is unnecessarily delayed on the next check.

**Fix**: Reset `lastInvalidationRef` to 0 when `computed_at` changes, so the next reconciliation check runs immediately.

- Add after line 125:
```typescript
useEffect(() => {
  lastInvalidationRef.current = 0;
}, [query.data?.computed_at]);
```

## Fix 3: Missing rowId Dedup Bypass (`useUnifiedDataSync.ts`)

**Problem**: If `payload.new?.id` and `payload.old?.id` are both undefined, rowId becomes `''`, collapsing all such events into one dedup key and dropping legitimate events.

**Fix**: In `shouldProcessEvent`, if rowId is empty, skip dedup entirely (return `true`).

- Line 133-134: Add early return:
```typescript
const shouldProcessEvent = useCallback((table: string, eventType: string, rowId: string): boolean => {
  if (!rowId) return true; // unknown row — always process
  const key = `${table}:${eventType}:${rowId}`;
  ...
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useUnifiedDataSync.ts` | Tab ID source tagging on BroadcastChannel; empty rowId bypass in dedup |
| `src/hooks/useHIESnapshot.ts` | Reset cooldown ref when `computed_at` changes |

## What Does NOT Change
- `usePerformanceSession.ts` (already gold-complete)
- Zero database/migration changes
- Edge functions unchanged
- Lock system unchanged

