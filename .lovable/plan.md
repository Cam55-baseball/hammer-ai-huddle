

# Hammers Modality — End-to-End Kill Test Execution Plan

## What I'll do (under 2 minutes wall time)

**Test user**: `95de827d-7418-460b-8b79-267bf79bdca4` (most-active account, 438 prior logs — guarantees enough signal for HIE/Hammer aggregations).
**T0**: captured at insert time (`now()` returned with the row).

### Step 1 — Insert (proxy for Quick Log)
Insert a `custom_activity_logs` row matching the QuickLogSheet payload:
- `activity_name='Test Kill Session'`, `duration_minutes=5`, `intensity_rpe=5`, `notes='kill test'`, `entry_date=current_date`, `completed=true`.
- Return full row JSON + `created_at - T0` delta.

### Step 2 — Dirty Trigger
- Read `hie_dirty_users WHERE user_id=...`.
- Confirm `dirtied_at > T0`. Return row JSON + delta.

### Step 3 — HIE Refresh (forced, no cron wait)
- Invoke `hie-refresh-worker` directly via `supabase--curl_edge_functions`.
- Read latest `hie_snapshots` row for user. Confirm `created_at > T0` and `development_confidence` populated. Return JSON + delta.

### Step 4 — Hammer State Compute (forced)
- Invoke `compute-hammer-state` with `{ user_id }`.
- Read latest `hammer_state_snapshots` row. Confirm `computed_at > T0` and all 4 core fields (`arousal_score`, `recovery_score`, `motor_state`, `overall_state`) present.
- **If function fails or returns nothing → inspect edge function logs, fix the bug, redeploy, retry.** (Currently 0 rows in `hammer_state_snapshots` system-wide — high risk this needs a fix.)

### Step 5 — UI Realtime Verification
- Open the preview via browser tools, log in if needed (will pause and ask user to log in if auth required — won't fill credentials without approval).
- Navigate to `/index` (Dashboard). Screenshot before/after.
- Wait up to 60s for `HammerStateBadge` + `ReadinessChip` to update via the realtime subscription wired in `useHammerState`.
- Measure UI latency from T0.

### Step 6 — Why Button Trace
- Click `WhyButton` on the Hammer State badge expansion.
- Capture the explanation sheet payload (inputs, thresholds, logic, neuro tags, confidence).
- Verify the "Test Kill Session" entry appears in the inputs and timestamps align with T0.

## Final Output

Single structured JSON report:
```
{
  test_user_id, T0,
  step1_log_insert: {row, delta_ms},
  step2_dirty_trigger: {row, delta_ms},
  step3_hie_snapshot: {snapshot, delta_ms},
  step4_hammer_state: {snapshot, delta_ms},
  step5_ui_latency_seconds,
  step6_why_trace: {payload},
  verdict: "PASS" | "FAIL",
  failures: [...]
}
```

## Failure handling (additive, no deletions)
If any step fails, I will:
1. Pull edge function logs for the failing function.
2. Identify root cause (missing column, bad query, RLS block, type mismatch).
3. Patch the edge function or migration **additively** (no schema removal).
4. Redeploy and rerun the failing step + all downstream steps.
5. Continue until full PASS or document a hard architectural blocker.

## Cleanup
The kill-test row stays in `custom_activity_logs` (it's real activity data — useful as a permanent integration smoke test). Marked clearly via `notes='kill test'` so the user can prune later if desired.

