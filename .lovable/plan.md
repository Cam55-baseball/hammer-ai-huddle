

# Final 3 Fixes — Eliminate Last Race Conditions

## Fix 1: Clear recovery timer on success path (`usePerformanceSession.ts`)

**Problem**: If Session A schedules a 15s recovery timer, then Session B completes with `hie_completed = true`, the old timer from A still fires — causing unnecessary refetches and UI flicker.

**Current code** (lines 197-201) already clears the timer *before* calling calculate-session. But it does NOT clear it again on the success path (line 230-231).

**Fix**: Inside the `if (hieCompleted)` branch (line 230), clear the recovery timer before invalidating analytics keys.

```typescript
if (hieCompleted) {
  if (recoveryTimerRef.current) {
    clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = null;
  }
  invalidateKeys(ANALYTICS_KEYS);
}
```

Lines 230-231 → expand to include timer cleanup.

---

## Fix 2: Reset reconciliation flag on fetch completion (`useHIESnapshot.ts`)

**Problem**: `reconciliationTriggered.current = true` blocks future reconciliation attempts. Current reset (lines 122-126) triggers on `computed_at` change — but if the invalidation fails (network issue, suspended tab), the flag stays `true` forever, deadlocking reconciliation.

**Fix**: Replace the `computed_at`-based reset with a fetch-state-based reset. When the query finishes fetching (regardless of outcome), unlock the flag.

```typescript
useEffect(() => {
  if (!query.isFetching) {
    reconciliationTriggered.current = false;
  }
}, [query.isFetching]);
```

Lines 122-126 → replace with the above.

---

## Fix 3: Granular realtime deduplication (`useUnifiedDataSync.ts`)

**Problem**: Current dedup uses only `table` name (line 179). This drops legitimate events — e.g., an INSERT followed by an UPDATE on the same table within 500ms (common when `calculate-session` writes derived fields after insert).

**Fix**: Track `(table, eventType, rowId)` instead of just `table`. Only dedup truly identical events.

Change `lastEventRef` type and comparison:

```typescript
const lastEventRef = useRef<{ table: string; eventType: string; rowId: string; ts: number }>(
  { table: '', eventType: '', rowId: '', ts: 0 }
);

// In handleDatabaseChange:
const rowId = payload.new?.id || payload.old?.id || '';
const now = Date.now();
if (
  lastEventRef.current.table === table &&
  lastEventRef.current.eventType === payload.eventType &&
  lastEventRef.current.rowId === rowId &&
  now - lastEventRef.current.ts < 500
) {
  return;
}
lastEventRef.current = { table, eventType: payload.eventType, rowId, ts: now };
```

Lines 156, 178-182 → update ref type and comparison logic.

Also: Remove `['delta-analytics']` and `['day-sessions']` from reconnect fallback (lines 223-226) since delta-analytics is derived from snapshot and day-sessions is session-scoped. Final fallback set:

```typescript
queryClient.invalidateQueries({ queryKey: ['hie-snapshot'] });
queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
queryClient.invalidateQueries({ queryKey: ['fatigue-state'] });
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePerformanceSession.ts` | Clear recovery timer in success branch (lines 230-231) |
| `src/hooks/useHIESnapshot.ts` | Reset reconciliation flag based on `isFetching` (lines 122-126) |
| `src/hooks/useUnifiedDataSync.ts` | Granular dedup with `(table, eventType, rowId)` (lines 156, 178-182); trim reconnect fallback keys (lines 223-227) |

## What Does NOT Change
- Zero formula modifications
- Zero database/migration changes
- Edge functions unchanged
- Lock system unchanged
- `useSchedulingRealtime.ts` unchanged

