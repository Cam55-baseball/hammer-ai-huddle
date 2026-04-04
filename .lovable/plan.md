

# Gold Architecture — Final Hardening

## What's Already Correct
- `usePerformanceSession.ts` — fully matches spec (latest-wins, conditional invalidation, timer-safe)
- Lock system, edge functions, DB schema — all complete

## What Needs Updating

### 1. `useHIESnapshot.ts` — Reconciliation Hardening

**Current gaps vs gold spec:**
- No visibility check (runs in background tabs, wasting queries)
- No online check (fires invalidations while offline)
- Boolean `reconciliationTriggered` flag instead of cooldown-based throttle (5s)
- No resume triggers (visibilitychange / online events to catch up after sleep)

**Changes:**
- Replace `reconciliationTriggered` ref with `lastInvalidationRef` (timestamp-based 5s cooldown)
- Add `document.visibilityState` and `navigator.onLine` guards to reconciliation effect
- Add `navigator.onLine` guard to 24h stale fallback
- Remove the `isFetching` reset effect (no longer needed with cooldown model)
- Add resume triggers: `visibilitychange` → invalidate `['hie-snapshot']`, `online` → same

### 2. `useUnifiedDataSync.ts` — Per-Row Dedup Map + Multi-Tab Sync

**Current gaps:**
- Single-ref dedup only tracks one event at a time — concurrent events on different rows/tables can collide
- No multi-tab synchronization (tabs fight each other)
- No reconnect timer cleanup on successful reconnect

**Changes:**
- Replace `lastEventRef` (single object) with `lastEventMapRef` (Map keyed by `table:eventType:rowId`)
- Add memory leak guard (clear map at 1000 entries)
- Add BroadcastChannel (`data-sync`) for multi-tab invalidation propagation
- Wrap `invalidateRelatedQueries` to also broadcast to other tabs
- Listen for broadcasts from other tabs and invalidate locally
- Clear `reconnectTimerRef` on successful reconnect

### 3. `usePerformanceSession.ts` — No Changes

Already matches the gold spec exactly.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useHIESnapshot.ts` | Cooldown-based reconciliation, visibility/online guards, resume triggers |
| `src/hooks/useUnifiedDataSync.ts` | Map-based per-row dedup, BroadcastChannel multi-tab sync, reconnect cleanup |

## What Does NOT Change
- `usePerformanceSession.ts` (already correct)
- Zero formula modifications
- Zero database/migration changes
- Edge functions unchanged
- Lock system unchanged
- `useSchedulingRealtime.ts` unchanged

