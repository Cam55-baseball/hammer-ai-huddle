

# Kill Test V3 — Time, Load, Failure & Recovery (Final Proof)

## Objective
Prove the Hammers Modality engine survives **sustained load**, **cron overlap**, **partial failure + recovery**, and **time-based consistency** — not just instant happy-path bursts. This is the production-readiness test.

---

## Test Matrix

| Variable | V1 | V2 | **V3** |
|---|---|---|---|
| Users | 1 | 3 | **10** |
| Duration | <30s | <60s | **~5 min** |
| Inserts | 1 | 5 | **~120** |
| Failure injection | ❌ | ❌ | ✅ |
| Cron overlap | ❌ | ❌ | ✅ |
| Time evolution check | ❌ | partial | ✅ |

---

## Test Subjects (10 users)
Selected at execution time from `athlete_mpi_settings` ordered by recent activity. User A (`95de827d…`) anchored as the deep-trace subject. Final 10 IDs reported in output.

---

## Execution Plan

### Step 1 — Sustained Load (60s burst)
Generate ~120 inserts via SQL: a single `INSERT … SELECT … FROM generate_series(1,12) ts CROSS JOIN unnest(ARRAY[10 user_ids])` writing 10 rows per "tick" with `created_at = now() + interval (ts * 5s)` actually executed in a tight loop with `pg_sleep(5)` between batches via Supabase migration-free approach: I'll script 12 sequential `read_query`-equivalent INSERT batches spaced by sleeps. Each batch: 10 rows tagged `notes='kill v3 tick<n>'`. Capture per-insert latency.

### Step 2 — Dirty Queue Inspection (during load)
Between batches, `SELECT user_id, dirtied_at FROM hie_dirty_users WHERE user_id = ANY(test_users)`. Verify: row count stays ≤10, `dirtied_at` advances monotonically per user (proves dedup + freshness).

### Step 3 — Worker Backpressure (3 invocations during load)
Invoke `hie-refresh-worker` 3× spaced ~20s apart while inserts continue. Each invocation should drain the queue. After each: query `hie_snapshots` for fresh rows per user. Track which users got processed in each pass — flag any user skipped twice in a row (starvation).

### Step 4 — Hammer State Evolution (4 invocations × 15s)
Invoke `compute-hammer-state` for all 10 users at T+0, T+15, T+30, T+45. For User A specifically: collect all 4 snapshots and verify `arousal_score` / `recovery_score` / `dopamine_load` **change across time** (proves engine reacts to new inputs, not cached). Acceptance: at least 1 axis must vary by ≥1 point between consecutive snapshots.

### Step 5 — Cron Overlap Simulation
Invoke `hie-refresh-worker` and `compute-hammer-state` **concurrently** (Promise.all-style via two parallel `curl_edge_functions` calls). Then check:
- `hie_execution_locks` table for stuck locks (none should persist after run)
- No duplicate `hie_snapshots` rows for the same `(user_id, created_at)` pair within a 1-second window
- `audit_log` for any lock violation entries

### Step 6 — Failure + Recovery Test
**Inject failure**: write a deliberately broken patch to `compute-hammer-state` (e.g., reference a non-existent column) → deploy → invoke → confirm it errors. Continue inserting 20 more logs across the 10 users. **Restore**: revert the patch → redeploy → invoke `compute-hammer-state`. Verify: new snapshots include the inputs from the failure window (proves no permanent data loss; aggregations re-read raw tables, not cached state).

### Step 7 — Data Consistency Audit (User A)
For User A, query:
- Last 15 `custom_activity_logs` rows from this test
- Latest `hie_snapshots.weakness_clusters` and `behavioral_signals`
- Latest `hammer_state_snapshots.dopamine_inputs.completions_last_6h` and `motor_inputs.session_count_3d`

Verify: counts in aggregated inputs match raw log counts within expected windows (24h / 3d / 6h). Any input claiming N completions must be backed by N actual rows.

### Step 8 — UI Truth Over Time
Open browser preview as User A. Take baseline screenshot. Wait 30s. Insert 3 more logs. Wait 30s for realtime + cron settle. Hard-refresh. Compare badge values to latest DB row. Repeat once more. Acceptance: UI value matches `hammer_state_snapshots.overall_state` from latest DB read after every refresh.

### Step 9 — WhyButton Deep Trace (User A)
Click `WhyButton` on Hammer State badge after all load. Inspect payload. Verify: `dopamine_inputs.completions_last_6h` shows ≥10 (most of the 12 ticks fall in 6h window), `motor_inputs.session_count_3d` reflects all V3 + leftover V1/V2 logs, timestamps span the full test window.

---

## Failure Handling (Additive Only)
For any step failure:
1. Pull `edge_function_logs` + `analytics_query` on `function_edge_logs`
2. Identify root cause (lock contention, race, missing column, type coercion)
3. Patch additively — new migration or edge function fix, **never schema removal**
4. Redeploy, rerun failed step + downstream
5. Document failure evidence + fix in final report
6. Step 6 (intentional failure) is **expected to fail and recover** — that's the test, not a real failure

## Final Output
```json
{
  test_users: [10 IDs],
  T0,
  step1_load: { expected: 120, actual: N, latency_p50_ms, latency_p95_ms, dropped: N },
  step2_dirty_queue: { max_size_observed, dedup_violations: 0 },
  step3_worker: { runs: 3, users_processed_per_run: [N,N,N], starvation_count: 0 },
  step4_hammer_evolution: { user_A_snapshots: [4 timestamped values], axis_variation_proven: true },
  step5_cron_overlap: { duplicate_snapshots: 0, stuck_locks: 0, audit_violations: 0 },
  step6_failure_recovery: { failure_injected: true, error_captured: "...", recovery_verified: true, data_loss: false },
  step7_consistency: { user_A: { logs_count, hie_input_count, hammer_input_count, aligned: true } },
  step8_ui_truth: { refreshes: 2, mismatches: 0 },
  step9_why_trace: { dopamine_completions_6h, motor_sessions_3d, oldest_input_ts, newest_input_ts },
  verdict: "PASS" | "FAIL",
  failure_points: [],
  system_limitations: [],
  fixes_applied: []
}
```

## Time Budget
~6-8 minutes wall time (most spent in deliberate sleeps for load timing). Browser steps (8) require User A logged in — current session replay shows auth screen, will pause and request login if not authenticated by time we reach Step 8.

## Cleanup
All `kill v3` rows remain as permanent integration smoke-test markers (filterable via `notes LIKE 'kill v3%'`).

