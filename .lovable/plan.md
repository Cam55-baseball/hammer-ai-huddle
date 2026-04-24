

# Kill Test V2 — Repeatability, Concurrency & Truth Validation

## Objective
Prove the Hammers Modality engine is **real, stable, non-flaky** under: rapid-fire input, multi-user concurrency, double-run stability, hard-refresh UI integrity, and full WhyButton trace fidelity.

## Test Subjects
- **User A** — `95de827d-7418-460b-8b79-267bf79bdca4` (438+ logs, used in V1 PASS)
- **User B & C** — selected from top-active accounts in `athlete_mpi_settings` with prior session data (queried at execution time; will report exact IDs in final output)
- **T0** — captured at first insert via `now()` returned in row

## Execution Sequence

### Step 1 — Rapid-Fire Same-User Inserts
Insert 3 sequential `custom_activity_logs` rows for User A (`Kill Test A1`, `A2`, `A3`; `duration=5`, `RPE=5`, `notes='kill test v2'`) within a 5-second window via 3 separate `INSERT ... RETURNING *` statements. Verify: 3 distinct rows, monotonically increasing `created_at`.

### Step 2 — Dirty Queue Dedup Check
`SELECT * FROM hie_dirty_users WHERE user_id = A`. Confirm exactly **one row** with `dirtied_at` matching the latest of the 3 inserts (proves `ON CONFLICT (user_id) DO UPDATE` dedup logic works).

### Step 3 — Parallel Multi-User Inserts + Single Worker Run
Insert 1 log each for A, B, C in a single transaction batch. Wait 2s. Invoke `hie-refresh-worker` **once** via `supabase--curl_edge_functions`. Verify: 3 fresh rows in `hie_snapshots` (one per user) with `created_at > T0`.

### Step 4 — Hammer State Per-User Differentiation
Invoke `compute-hammer-state` with `{ user_id }` for each of A, B, C. Read latest `hammer_state_snapshots` per user. Verify: distinct `arousal_score` and `recovery_score` values (proves per-user computation, not cached/shared).

### Step 5 — Double-Run Stability
Re-invoke `hie-refresh-worker` and `compute-hammer-state` for all 3 users immediately. Verify: row counts increment by expected amount (1 per user per function), no duplicate timestamps, no row explosion (>2x expected).

### Step 6 — UI Hard-Refresh Persistence
Open browser preview at `/index` as User A (current logged-in user per session replay). Capture `HammerStateBadge` + `ReadinessChip` values via screenshot. Insert one more log. Hard-refresh page. Re-screenshot. Compare: UI values must match DB snapshot exactly (proves no fake optimistic state).

### Step 7 — WhyButton Truth Audit
Click `WhyButton` on Hammer State badge expansion AND on an HIE cluster card. Inspect `WhyExplanationSheet` payload. Verify: shows multiple `Kill Test` entries (A1, A2, A3 + parallel log) with correct timestamps, neuro tags from `module_neuro_map`, thresholds from `engine_settings`.

### Step 8 — Timing Envelope
Measure 4 deltas from each insert:
- Insert → `hie_dirty_users.dirtied_at` (target <5s)
- Insert → new `hie_snapshots.created_at` (target <30s)
- Insert → new `hammer_state_snapshots.computed_at` (target <30s)
- Insert → UI reflects new state (target <60s, measured via screenshot timestamps)

## Failure Handling (Additive Only)
For any failed step:
1. Pull edge function logs via `supabase--edge_function_logs`
2. Identify root cause (RLS, missing field, dedup bug, cache leak, etc.)
3. Patch edge function or write **additive** migration (no schema removal)
4. Redeploy via `supabase--deploy_edge_functions`
5. Rerun failing step + all downstream steps
6. Document both failure evidence and fix in final report

## Final Output (single structured JSON)
```
{
  users: { A, B, C },
  T0,
  step1_rapid_fire: [3 rows + deltas],
  step2_dirty_dedup: { row_count, dirtied_at, latest_insert_at },
  step3_parallel_snapshots: [3 hie_snapshots],
  step4_hammer_per_user: [3 hammer_snapshots with arousal/recovery],
  step5_double_run: { hie_rows_added, hammer_rows_added, duplicates: 0 },
  step6_ui_consistency: { before_screenshot, after_screenshot, db_match: true|false },
  step7_why_audit: { hammer_inputs[], hie_inputs[], neuro_tags[], thresholds[] },
  timing: { dirty_ms, hie_ms, hammer_ms, ui_seconds },
  verdict: "PASS" | "FAIL",
  failure_points: [],
  fixes_applied: []
}
```

## Cleanup
All `kill test v2` rows remain in DB as permanent integration smoke-test markers (filterable via `notes='kill test v2'`).

## Time Budget
~3-4 minutes wall time. Browser steps (6) gated on user being logged in as User A in the preview — if not, will pause and request login before proceeding (will not auto-fill credentials).

