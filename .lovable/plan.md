

# Scheduling System — Elite Standard Elevation

## Changes

### 1. `src/hooks/useSchedulingRealtime.ts` — Precision Realtime + Scoped Invalidation

Replace the single `invalidateAll` with event-specific handlers for `performance_sessions`:

- **INSERT**: Extract `session_date` from `payload.new`, invalidate `['day-sessions', userId, session_date]` + `['calendar']` + `['recent-sessions']`
- **UPDATE**: Extract `session_date` from both `payload.new` and `payload.old` (in case date changed), invalidate both scoped day-sessions keys
- **DELETE**: Same scoped invalidation + remove from cache

Keep existing `invalidateAll` for the other 7 scheduling tables (they don't have date-scoped queries).

Add the `performance_sessions` subscription with three separate `.on()` calls for `INSERT`, `UPDATE`, `DELETE` events instead of `*`.

### 2. `src/hooks/useDaySessions.ts` — Deterministic Ordering + Self-Healing

- Add secondary sort: `.order('id', { ascending: false })` after `created_at` to guarantee stable ordering under rapid writes
- Override `refetchOnWindowFocus: true` to recover from missed realtime events
- Add `refetchInterval: 45_000` (45s periodic reconciliation) as a safety net

### 3. `src/hooks/useRecentSessions.ts` — Same Hardening

- Add `.order('id', { ascending: false })` secondary sort
- Add `refetchOnWindowFocus: true`

### 4. `src/hooks/usePerformanceSession.ts` — Backend Duplicate Protection

Add a client-side idempotency key:
- Generate a `crypto.randomUUID()` idempotency key when `createSession` is called
- Store it in the session's insert payload (new column `idempotency_key`)
- This prevents double-inserts if the network retries

**Database migration**: Add `idempotency_key` column with a unique constraint:
```sql
ALTER TABLE performance_sessions ADD COLUMN idempotency_key text;
CREATE UNIQUE INDEX idx_perf_sessions_idempotency ON performance_sessions (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### 5. `src/App.tsx` — No Change

Keep global `refetchOnWindowFocus: false` as default. The two session hooks override it locally. This avoids unnecessary refetches across the entire app.

### 6. Database Migration — Enable Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_sessions;
```

## Files

| File | Change |
|------|--------|
| `src/hooks/useSchedulingRealtime.ts` | Split `performance_sessions` into INSERT/UPDATE/DELETE handlers with scoped invalidation |
| `src/hooks/useDaySessions.ts` | Deterministic ordering, `refetchOnWindowFocus`, periodic refetch |
| `src/hooks/useRecentSessions.ts` | Deterministic ordering, `refetchOnWindowFocus` |
| `src/hooks/usePerformanceSession.ts` | Add `idempotency_key` to insert payload |
| Migration | Add `idempotency_key` column + unique index + enable realtime publication |

