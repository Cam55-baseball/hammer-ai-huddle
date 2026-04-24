

# Kill Test V3.1 — Failure Recovery & UI Truth (Final 10%)

## Objective
Close the two unverified gaps from V3:
1. **Real failure injection + automatic recovery with zero data loss**
2. **UI truth over time — DB state matches what the user actually sees, before AND after hard refresh**

Plus verify the previously skipped user (lock contention casualty) is processed on next run.

---

## Pre-Flight
- **User A** = `95de827d-7418-460b-8b79-267bf79bdca4` (deep-trace anchor)
- **Users B, C** = top 2 active users from V3 batch (will reconfirm at runtime)
- **Skipped user** = identify from V3 worker output (the one flagged `failed:1` due to lock)
- **T0** captured at first failure-window insert via `now() RETURNING`

---

## Step 1 — Force Failure (Real Break)

**Patch `compute-hammer-state/index.ts`** with a deliberate, traceable error placed AFTER the user lookup but BEFORE the snapshot insert — guarantees the function reaches user-processing, attempts work, and fails loudly:

```ts
// KILL TEST V3.1 — INTENTIONAL FAILURE (will be reverted)
throw new Error('KILL_TEST_V3_1_FORCED_FAILURE: intentional break to verify recovery');
```

Deploy via `supabase--deploy_edge_functions(['compute-hammer-state'])`.

**Generate the failure window**:
- Insert 10 `custom_activity_logs` rows distributed across Users A, B, C, all tagged `notes='kill v3.1 failure-window'`. Capture `created_at` of every row.

**Invoke** `compute-hammer-state` for each of A/B/C via `supabase--curl_edge_functions`.

**Verify**:
- All 3 invocations return non-2xx OR contain the forced-error string in response
- `supabase--edge_function_logs(compute-hammer-state, 'KILL_TEST_V3_1')` shows the error
- `SELECT count(*) FROM hammer_state_snapshots WHERE user_id IN (A,B,C) AND computed_at > T0` returns **0** (no corrupt writes)

**Pass criteria**: function fails loudly, zero snapshots written, errors captured in logs.

---

## Step 2 — Recovery (Zero Data Loss Proof)

**Revert** `compute-hammer-state/index.ts` — remove the `throw` line, restore original code. Redeploy.

**Continue load** during the recovery window — insert 5 more logs across A/B/C (`notes='kill v3.1 recovery-window'`). This proves the engine catches up across failure + recovery boundaries.

**Trigger reprocessing**:
- Invoke `hie-refresh-worker` once (drains dirty queue, refreshes HIE)
- Invoke `compute-hammer-state` for each of A/B/C

**Verify zero data loss** via row-level count alignment for each user:
```sql
-- Failure-window logs in 6h window
SELECT user_id, count(*) FROM custom_activity_logs
WHERE user_id IN (A,B,C) AND notes LIKE 'kill v3.1%' AND created_at >= T0;

-- vs aggregation in latest hammer snapshot
SELECT user_id, dopamine_inputs->>'completions_last_6h', motor_inputs->>'session_count_3d'
FROM hammer_state_snapshots
WHERE user_id IN (A,B,C)
ORDER BY computed_at DESC LIMIT 3;
```

**Pass criteria**: aggregated counts include every failure-window + recovery-window log. No row left behind.

---

## Step 3 — UI Truth Over Time (Login Required)

**Auth gate**: Current session is on `/index` but I need to confirm User A is authenticated (session replay shows logged-in state). I will:
1. `browser--navigate_to_sandbox` to `/index`
2. `browser--get_url` + screenshot to confirm we land on dashboard (not `/auth`)
3. **If redirected to /auth** → STOP and ask user to log in as User A. Will not auto-fill credentials.

**Truth Loop (executed twice)**:

For each iteration:
1. Screenshot dashboard, extract `HammerStateBadge` label + `ReadinessChip` score via `browser--extract`
2. Read latest DB snapshot via `supabase--read_query`: `SELECT overall_state, computed_at FROM hammer_state_snapshots WHERE user_id=A ORDER BY computed_at DESC LIMIT 1`
3. **Assert UI value === DB value** (baseline match)
4. Insert 1 new log for User A (`notes='kill v3.1 ui-truth-N'`)
5. Wait 30–60s via `project_debug--sleep` (lets cron + realtime settle; do NOT manually invoke — testing the auto-pipeline)
6. Re-screenshot + re-extract WITHOUT refresh — confirms realtime subscription updated badge in place
7. Hard refresh via `browser--navigate_to_sandbox` (forces fresh React Query fetch)
8. Re-screenshot + re-extract
9. Re-read DB
10. **Assert all three values align**: in-place update == post-refresh UI == latest DB

**Pass criteria**: No UI/DB mismatch across both loops. UI never reverts to stale state after refresh. UI does not lead the backend (no fake optimism on a derived metric like `overall_state`).

---

## Step 4 — Previously Skipped User Recovery

From V3 output: identify the user that was reported `failed:1` (lock contention).

**Verify**:
1. Confirm they're back in `hie_dirty_users` OR have a recent successful HIE snapshot
2. Invoke `hie-refresh-worker` once
3. Re-query `hie_snapshots` for that user — confirm `created_at` advanced (or `computed_at` if upsert path)
4. Re-invoke worker a second time and confirm same user was NOT skipped again

**Pass criteria**: Skipped user processed on next worker pass. No user is skipped on two consecutive runs.

---

## Failure Handling (Additive Only)
- Step 1 expected failure is the test, not a real failure
- For any real failure in Steps 2-4: pull `edge_function_logs` + `analytics_query` on `function_edge_logs`, identify root cause, patch additively (new migration or function fix, **never schema removal**), redeploy, rerun failed step + downstream
- **Hard guarantee**: `compute-hammer-state` will be reverted to working state by end of run regardless of test outcome — leaving production broken is unacceptable

---

## Final Output (single structured JSON)
```json
{
  T0,
  step1_failure: {
    failure_injected: true,
    error_captured: "...exact log line...",
    failure_window_logs_inserted: 10,
    snapshots_during_failure: 0
  },
  step2_recovery: {
    recovery_verified: true|false,
    data_loss: true|false,
    per_user: [
      { user_id, raw_logs_in_window: N, hammer_input_count: N, aligned: true|false },
      ...
    ]
  },
  step3_ui_truth: {
    auth_confirmed: true,
    iterations: [
      {
        baseline_match: true|false,
        post_update_no_refresh_match: true|false,
        post_hard_refresh_match: true|false,
        ui_value, db_value
      },
      { ... second iteration }
    ]
  },
  step4_skipped_user: {
    user_id,
    processed_on_next_run: true|false,
    skipped_twice_in_row: false
  },
  verdict: "PASS" | "FAIL",
  failure_points: [],
  fixes_applied: [],
  cleanup_confirmed: "compute-hammer-state restored to working state"
}
```

## Time Budget
~5–6 minutes wall time. Step 3 dominates (2 × 60s sleeps + screenshots).

## Cleanup
- All `kill v3.1` rows remain as permanent integration smoke-test markers (filterable via `notes LIKE 'kill v3.1%'`)
- `compute-hammer-state` MUST be reverted to working state before final report — non-negotiable

## Risk Acknowledgement
Step 1 deliberately breaks production for ~30–60 seconds. Real users invoking `compute-hammer-state` during that window would see errors. Acceptable because: (a) function is invoked on cron (~5min cadence) + dirty-trigger debounced, (b) failures gracefully no-op the UI (badge falls back to last-known state per `useHammerState` query cache), (c) test window is brief and bracketed by immediate revert.

