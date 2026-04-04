

# Complete Practice-Analysis-Dashboard Synchronization

## What's Missing

1. **Post-session invalidation** only covers `['recent-sessions']` — analytics keys are untouched
2. **Realtime** (`useSchedulingRealtime`) doesn't invalidate analytics on session/snapshot changes
3. **`useUnifiedDataSync`** is defined but never mounted — its `performance_sessions` and `hie_snapshots` mappings are missing
4. **`useHIESnapshot`** has no session-aware reconciliation (only 24h absolute staleness)
5. **`DataBuildingGate`** returns `null` during loading (line 45)

## Plan

### 1. Broaden post-session invalidation in `usePerformanceSession.ts`

After `calculate-session` returns (lines 203-204), invalidate all analytics keys:

```
['recent-sessions'], ['day-sessions'], ['calendar'],
['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
['split-analytics-composites'], ['fatigue-state'], ['latest-session-ts']
```

### 2. Add analytics invalidation to `useSchedulingRealtime.ts`

Extend `invalidateSessionDate` (lines 29-35) to also invalidate:
- `['hie-snapshot']`
- `['progressive-gate']`
- `['delta-analytics']`
- `['split-analytics-composites']`

Add a new realtime subscription for `hie_snapshots` table changes that invalidates `['hie-snapshot']`, `['progressive-gate']`.

### 3. Add `performance_sessions` and `hie_snapshots` to `useUnifiedDataSync.ts` TABLE_QUERY_MAPPINGS

```typescript
'performance_sessions': [
  ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
  ['recent-sessions'], ['day-sessions'], ['fatigue-state'], ['calendar'],
],
'hie_snapshots': [
  ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
],
```

### 4. Mount `useUnifiedDataSync()` in `DashboardLayout.tsx`

Add `useUnifiedDataSync()` call so realtime cross-module sync is active on all dashboard pages.

### 5. Add session-aware reconciliation to `useHIESnapshot.ts`

Add a `latest-session-ts` query that fetches the most recent session's `created_at`. In a reconciliation effect, if the latest session timestamp exceeds `computed_at` by >10 seconds, auto-trigger refresh. This replaces reliance on 24h-only staleness.

Expose `computedAt` in the return value.

### 6. Replace `return null` with skeleton in `DataBuildingGate.tsx`

Line 45: replace `if (isLoading) return null;` with a skeleton loader using the existing `StatsGridSkeleton` pattern.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePerformanceSession.ts` | Broad invalidation of all analytics keys after session save |
| `src/hooks/useSchedulingRealtime.ts` | Add analytics keys to `invalidateSessionDate` + `hie_snapshots` subscription |
| `src/hooks/useUnifiedDataSync.ts` | Add `performance_sessions` and `hie_snapshots` table mappings |
| `src/components/DashboardLayout.tsx` | Mount `useUnifiedDataSync()` |
| `src/hooks/useHIESnapshot.ts` | Add `latest-session-ts` query + reconciliation effect + expose `computedAt` |
| `src/components/analytics/DataBuildingGate.tsx` | Replace `return null` with skeleton loader |

## What Does NOT Change
- Zero formula modifications
- Zero database/migration changes
- Edge functions unchanged
- Lock system unchanged

