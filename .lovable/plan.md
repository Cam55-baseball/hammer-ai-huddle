

# E2E Execution Verification — Elite Implementation Plan

## Phase A — DB Schema Verification (Completed)

All three prerequisites confirmed via live queries:

| Check | Result |
|-------|--------|
| `idempotency_key` column exists | `text`, nullable ✓ |
| Unique index `idx_perf_sessions_idempotency` | Active, partial (`WHERE idempotency_key IS NOT NULL`) ✓ |
| Realtime publication | `performance_sessions` in `supabase_realtime` ✓ |

**Note**: Existing rows have empty `idempotency_key` — expected (pre-migration sessions). New sessions will populate this field.

## Phase B — Playwright E2E Suite

### New file: `e2e/scheduling-elite.spec.ts`

Six deterministic tests, all using the shared Playwright fixture from `playwright-fixture.ts`.

---

### Test 1: Rapid Write Stress (10 Sessions in <5s)

- Authenticate via Supabase `signInWithPassword` in `beforeAll`
- Insert 10 `performance_sessions` rows via Supabase JS client with unique `idempotency_key` each, same `session_date`
- **Assert**: DB count = 10, all IDs distinct, `created_at` ordering matches `id` ordering
- Navigate to calendar → open day sheet → **Assert**: UI shows exactly 10 sessions
- Wait 45s (reconciliation) → **Assert**: order unchanged
- Reload page → **Assert**: order unchanged

### Test 2: Idempotency Rejection

- Insert session with `idempotency_key = 'test-dupe-key'`
- Attempt second insert with same key
- **Assert**: second insert throws unique constraint error
- **Assert**: DB has exactly 1 row with that key

### Test 3: Multi-Date Isolation

- Insert sessions on 3 dates: today, yesterday, 2 days ago
- Navigate calendar to each date, open day sheet
- **Assert**: each day shows ONLY its own sessions, zero cross-day bleed

### Test 4: Network Failure Recovery

- Use `page.route('**/rest/v1/performance_sessions*', route => route.abort())` to block insert
- Attempt session creation via UI
- **Assert**: error toast appears, no DB row created
- Remove route block, retry
- **Assert**: single valid row in DB, UI reflects it

### Test 5: Missed Realtime / Reconciliation

- Insert session directly via Supabase admin client (bypassing UI)
- Do NOT trigger any UI interaction
- **Assert**: within 45s polling interval, session appears in calendar day sheet without manual refresh
- Alternative: trigger `visibilitychange` event to force `refetchOnWindowFocus`

### Test 6: Side Toggle Integrity

- Navigate to Practice Hub, start hitting session as switch hitter with `sideMode = 'BOTH'`
- Log 4 reps alternating R/L/R/L
- Complete session
- Query DB for the session's `drill_blocks`
- **Assert**: rep-level `batter_side` values = `['R', 'L', 'R', 'L']` in exact order
- Navigate to calendar → open session detail → **Assert**: UI shows matching side data

---

### Test Infrastructure

- Auth: `beforeAll` block authenticates with test credentials via `signInWithPassword`
- Cleanup: `afterEach` soft-deletes test sessions via `deleted_at` update
- Timing: Each assertion logs `performance.now()` timestamps for latency measurement
- No production code changes — verification only

## Files

| File | Purpose |
|------|---------|
| `e2e/scheduling-elite.spec.ts` | Complete 6-test E2E suite |

