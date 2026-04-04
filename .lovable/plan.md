

# Align Client Layer to Final Architecture Spec

## Violations Found

### 1. CLIENT CALLS `hie-analyze` DIRECTLY (Critical — §6, §9)
`useHIESnapshot.ts` line 115: `refreshMutation` invokes `hie-analyze` directly from the client. The spec explicitly forbids this. Reconciliation must only invalidate queries, never compute.

### 2. MUTATION FLOW MISSING LATEST-WINS + CONDITIONAL INVALIDATION (§4)
`usePerformanceSession.ts` does blanket invalidation of all analytics keys regardless of whether `hie_completed` is true or false. The spec requires:
- A `pendingCalcRef` to implement latest-wins (discard stale responses)
- Conditional invalidation: only invalidate analytics keys if `hie_completed === true`
- A single delayed recovery invalidation if `hie_completed === false`

### 3. REALTIME MISSING EVENT DEDUPLICATION (§5)
`useUnifiedDataSync.ts` has no 500ms deduplication guard. Rapid realtime events can cause invalidation storms.

### 4. REALTIME MISSING RECONNECT STRATEGY (§5)
No exponential backoff reconnect or fallback invalidation of critical keys on disconnect.

---

## Plan

### File 1: `src/hooks/useHIESnapshot.ts`

**Remove** the `refreshMutation` that calls `hie-analyze` directly. Replace all reconciliation logic to only invalidate the `['hie-snapshot', user.id]` query key — never invoke the edge function.

- Remove `useMutation` block (lines 112-129)
- Change reconciliation effect (lines 133-141): instead of `refreshMutation.mutate()`, call `queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] })`
- Change 24h stale auto-refresh (lines 152-160): same — invalidate only, never call server
- Remove `refreshAnalysis` and `isRefreshing` from return (or keep `refreshAnalysis` as a query invalidation for manual use)
- Keep `computedAt`, `isStale`, `snapshot`, `isLoading`

### File 2: `src/hooks/usePerformanceSession.ts`

**Add latest-wins guard and conditional invalidation.**

- Add `useRef` import and `pendingCalcRef`
- Before calling `calculate-session`, set `pendingCalcRef.current = crypto.randomUUID()`
- After `calculate-session` returns, check if `pendingCalcRef.current` still matches — if not, return early (another session superseded this one)
- Read `hie_completed` from the response
- If `hie_completed === true`: invalidate all analytics keys immediately
- If `hie_completed === false`: invalidate only session keys immediately, then schedule a single delayed (15s) invalidation of analytics keys as recovery
- Always invalidate session-related keys: `recent-sessions`, `day-sessions`, `calendar`, `fatigue-state`, `latest-session-ts`

### File 3: `src/hooks/useUnifiedDataSync.ts`

**Add 500ms event deduplication and reconnect strategy.**

- Add a `lastEventRef` tracking `{ table: string, ts: number }`
- In `handleDatabaseChange`, skip if same table event arrived within 500ms
- Add channel status monitoring: on `CHANNEL_ERROR` or `CLOSED`, attempt reconnect with exponential backoff (5 attempts: 1s, 2s, 4s, 8s, 16s)
- On reconnect failure, invalidate critical keys only: `['hie-snapshot']`, `['recent-sessions']`

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useHIESnapshot.ts` | Remove direct `hie-analyze` call; reconciliation uses query invalidation only |
| `src/hooks/usePerformanceSession.ts` | Add `pendingCalcRef` latest-wins, conditional invalidation based on `hie_completed`, delayed recovery |
| `src/hooks/useUnifiedDataSync.ts` | Add 500ms dedup guard, reconnect with backoff, fallback invalidation |

## What Does NOT Change
- Zero formula modifications
- Zero database/migration changes
- Edge functions unchanged
- Lock system unchanged
- `useSchedulingRealtime.ts` unchanged (already correct)
- `DataBuildingGate.tsx` unchanged (already uses skeletons)
- `DashboardLayout.tsx` unchanged (already mounts `useUnifiedDataSync`)

