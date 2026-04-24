

# Phase 6 — Engine Governance, Guarantees & Anti-Fragility Layer

Strictly additive. No engine logic modified beyond a single post-INSERT hook in `compute-hammer-state`. All seven parts are observability, regression, and recovery layers that sit beside the engine.

---

## Architectural Principle

The engine produces snapshots. Every other system in this phase **observes, validates, or contains** the engine — none replace or mutate its primary output. The Optimizer (Phase 4) gets one new safety check (drift guard). The compute path gets one new versioning insert (reproducibility). Everything else is independent cron functions writing to their own tables.

---

## PART 1 — Engine Snapshot Versioning (Reproducibility)

### Schema (1 migration)
```sql
engine_snapshot_versions
  id uuid pk default gen_random_uuid()
  snapshot_id uuid not null references hammer_state_snapshots(id) on delete cascade
  user_id uuid not null
  engine_version text not null default 'v1.0.0'
  weights jsonb not null default '{}'      -- snapshot of engine_dynamic_weights at compute time
  profile jsonb                            -- snapshot of user_engine_profile at compute time
  inputs jsonb not null                    -- raw aggregates: load_24h, recovery_score, freshness_6h, dopamine, arousal, cognitive
  output jsonb not null                    -- full final snapshot row
  created_at timestamptz default now()
```
Indexes: `(user_id, created_at desc)`, `(snapshot_id)`, `(engine_version, created_at desc)`.
RLS: user reads own; service role writes; admin reads all.
Retention: 180 days via `cleanup_old_snapshot_versions()`.

### Modify `compute-hammer-state` (single additive INSERT after existing INSERT)
After the snapshot is written, perform one fire-and-forget INSERT to `engine_snapshot_versions` capturing:
- The newly created `snapshot_id`
- Current `engine_dynamic_weights` snapshot (the `w` object already loaded)
- Current `user_engine_profile` row (already loaded)
- Input vector: `{ load_24h, recovery_score_used, freshness_6h, arousal_inputs, dopamine_inputs, cognitive_inputs }`
- Full output: the snapshot row just created

If the INSERT fails, log warning and continue — engine output is already persisted. **Zero behavior change.**

---

## PART 2 — Regression Test Engine (Historical Truth)

### Schema (same migration)
```sql
engine_regression_results
  id uuid pk default gen_random_uuid()
  run_at timestamptz default now()
  test_case text not null              -- 'high_load' | 'recovery' | 'volatility' | 'edge_sentinel' | 'edge_adversarial'
  baseline_snapshot_id uuid            -- reference, not FK (snapshot may have aged out)
  baseline_state text not null
  new_state text not null
  drift_score int not null             -- 0..100 using STATE_DISTANCE matrix
  pass boolean not null
  metadata jsonb default '{}'
  user_id uuid                         -- for filtering admin views
```
Index: `(run_at desc)`, `(pass, run_at desc)`.
RLS: admin/owner read; service role write.
Retention: 90 days via `cleanup_old_regression_results()`.

### New edge function: `engine-regression-runner`
Schedule: every 12h at `:11`.
Auth: `verify_jwt = false`.

Logic:
1. Pull 50 historical `engine_snapshot_versions` rows balanced across:
   - 10 high-load (load_24h in top quartile)
   - 10 recovery state
   - 10 high-volatility users
   - 10 sourced from `engine_sentinel_logs WHERE drift_flag=true` last 30d
   - 10 sourced from `engine_adversarial_logs WHERE pass=false` last 30d
2. For each: re-run the engine math **using current weights** against the stored input vector (no DB writes, pure recomputation in-function)
3. Compute `drift_score` using existing `STATE_DISTANCE` matrix from sentinel: `prime↔ready=10`, `ready↔caution=20`, `caution↔recover=30`, `prime↔recover=70`, etc.
4. `pass = drift_score <= 25`
5. INSERT one row per test case
6. If overall fail rate > 10% in this run → INSERT to `audit_log` with `action='engine_regression_detected'` and the run summary

**Pure read — never writes to engine tables, never invokes compute-hammer-state for production.**

---

## PART 3 — Weight Drift Guard (Anti-Runaway)

### Schema (same migration)
```sql
engine_weight_history
  id uuid pk default gen_random_uuid()
  axis text not null
  weight numeric not null               -- final value after this adjustment
  delta numeric not null                -- delta this run
  source text not null                  -- 'optimizer' | 'manual_admin' | 'safe_mode_reset'
  created_at timestamptz default now()
  metadata jsonb default '{}'
```
Index: `(axis, created_at desc)`, `(created_at desc)`.
RLS: admin/owner read; service role write.
Retention: 365 days via `cleanup_old_weight_history()`.

### Modify `engine-weight-optimizer`
Add **drift guard** before applying each axis adjustment:
```ts
// For each axis with non-zero perAxis[axis]:
const { data: last24h } = await supabase
  .from('engine_weight_history')
  .select('delta')
  .eq('axis', axis)
  .gte('created_at', new Date(Date.now() - 86400000).toISOString());

const cumulative = (last24h ?? []).reduce((s, r) => s + Math.abs(Number(r.delta)), 0);

if (cumulative + Math.abs(perAxis[axis]) > 0.15) {
  // BLOCK
  await supabase.from('audit_log').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    action: 'weight_drift_blocked',
    table_name: 'engine_dynamic_weights',
    metadata: { axis, attempted_delta: perAxis[axis], cumulative_24h: cumulative }
  });
  continue; // skip this axis
}
```
After successful upsert, INSERT one row to `engine_weight_history` with `(axis, weight: next, delta: perAxis[axis], source: 'optimizer')`.

This guarantees **no axis can drift more than 0.15 cumulative absolute delta in 24h** regardless of how many runs occur.

---

## PART 4 — Prediction Accuracy Tracker

### Schema (same migration)
```sql
prediction_outcomes
  id uuid pk default gen_random_uuid()
  prediction_id uuid not null references engine_state_predictions(id) on delete cascade
  actual_state_24h text not null        -- the snapshot state observed at +24h
  actual_snapshot_id uuid               -- the snapshot used for comparison
  accuracy_score int not null           -- 0|40|70|100
  created_at timestamptz default now()
```
Index: `(prediction_id)` UNIQUE, `(created_at desc)`, `(accuracy_score, created_at desc)`.
RLS: user reads own (via prediction join); admin reads all; service role writes.
Retention: 90 days via `cleanup_old_prediction_outcomes()`.

### New edge function: `evaluate-predictions`
Schedule: every 4h at `:37`.
Auth: `verify_jwt = false`.

Logic:
1. Pull `engine_state_predictions` rows where `created_at` between 24h and 30h ago, AND no row in `prediction_outcomes` references them
2. For each: find the user's most recent `hammer_state_snapshots` row created within ±2h of the prediction's +24h target time
3. If no qualifying snapshot found → skip (will be retried until prediction ages past 30h window)
4. Score:
   - `predicted_state_24h === actual` → 100
   - States are adjacent (prime↔ready, ready↔caution, caution↔recover) → 70
   - Two states apart → 40
   - Opposite extremes (prime↔recover) → 0
5. INSERT to `prediction_outcomes`
6. After processing all rows, compute rolling 24h average accuracy. If avg < 50 AND sample size ≥ 5 → INSERT to `engine_weight_adjustments` with `source='prediction_error'`, `affected_axis='cognitive'`, `suggested_delta=-0.005`, `applied=false`, metadata explaining the trigger. (The optimizer reads this on next run.)

---

## PART 5 — System Health Score (Single Truth Metric)

### Schema (same migration)
```sql
engine_system_health
  id uuid pk default gen_random_uuid()
  score int not null                    -- 0..100
  breakdown jsonb not null              -- per-component scores
  created_at timestamptz default now()
```
Index: `(created_at desc)`.
RLS: admin/owner read; service role write.
Retention: 30 days via `cleanup_old_system_health()`.

### New edge function: `compute-system-health`
Schedule: every 15min at `:52`.
Auth: `verify_jwt = false`.

Inputs (all from last 24h):
- `heartbeat_success_rate` = % of expected 96 runs that succeeded (from `engine_heartbeat_logs`)
- `sentinel_drift_rate` = 1 - (drift_flag=true count / total runs from `engine_sentinel_logs`)
- `adversarial_pass_rate` = pass=true count / total from `engine_adversarial_logs` last 7d
- `regression_pass_rate` = pass=true count / total from `engine_regression_results` last 24h (or last 7d if <2 runs)
- `prediction_accuracy_avg` = avg(accuracy_score) from `prediction_outcomes` last 24h
- `advisory_effectiveness_avg` = avg(effectiveness_score) clamped 0..100 from `advisory_feedback_logs` last 7d (since advisory runs less frequently)

Score formula (weighted):
```
score = round(
  heartbeat_success_rate * 0.20 +
  sentinel_drift_rate * 0.20 +
  adversarial_pass_rate * 0.20 +
  regression_pass_rate * 0.20 +
  (prediction_accuracy_avg / 100) * 0.10 +
  (clamp(advisory_effectiveness_avg, 0, 100) / 100) * 0.10
) * 100
```
Missing inputs default to 1.0 (don't punish a layer that hasn't run yet — but `breakdown` records `null` so the UI can show "no data").

INSERT row + log to `audit_log` if score drops > 10pts vs previous run.

### UI: Health badge on `/engine-health`
Modify `src/pages/EngineHealthDashboard.tsx`:
- Top-of-page badge: `System Integrity: {score}/100`
- Color: green ≥ 90, amber 75–89, red < 75
- Click expands modal showing 6-component breakdown with sparklines

New hook: `src/hooks/useSystemHealth.ts` — reads latest row + realtime subscription.

---

## PART 6 — Kill Switch (Safe Mode)

### New edge function: `engine-reset-safe-mode`
Auth: `verify_jwt = true` + admin role check in function (NOT cron — manual only).

Logic:
1. Verify caller has admin role
2. `DELETE FROM engine_dynamic_weights` (engine immediately reverts to all `?? 1` defaults)
3. `DELETE FROM user_engine_profile` (optional — controlled by request body `{ reset_profiles: true }`)
4. INSERT to `engine_weight_history` for each axis with `source='safe_mode_reset'`, `delta=-(prev_weight - 1.0)`
5. INSERT to `audit_log` with `action='safe_mode_enabled'`, `metadata={ caller_user_id, reset_profiles, reset_timestamp }`
6. Return JSON confirmation

### UI: Safe Mode button
Add to `OwnerEngineSettingsPanel`:
- Red destructive button: "Engine Safe Mode (Instant Reset)"
- Confirmation dialog: "This will delete all dynamic weights and revert the engine to baseline. Continue?"
- Optional checkbox: "Also reset user engine profiles"
- Calls function, displays result toast

---

## PART 7 — Chaos Testing Mode (Admin Only)

### New edge function: `engine-chaos-test`
Auth: `verify_jwt = true` + admin role check.

Logic (all temporary, fully reversible):
1. Snapshot current weights to `audit_log` metadata for restoration
2. Randomly perturb each axis weight by ±0.10 (within 0.5..1.5 clamp)
3. Immediately invoke `engine-sentinel` and `engine-adversarial` via fire-and-forget
4. Wait 30s for them to complete
5. Read back: how many sentinel drifts? how many adversarial fails?
6. Restore original weights from snapshot
7. INSERT to `audit_log` with `action='chaos_test_completed'` and full result summary
8. Return JSON: `{ baseline_weights, chaos_weights, sentinel_drifts, adversarial_fails, restored: true }`

### UI: Chaos Test button
Add to `OwnerEngineSettingsPanel`:
- Amber button: "Run Chaos Test"
- Confirmation: "This perturbs engine weights for 30s then restores them. Real users may briefly see slightly different states."
- Display result in dialog after completion

---

## CRON SCHEDULE (Final, all phases)
```
:00,:15,:30,:45    Heartbeat (15min)        — Phase 3
:07                Sentinel (hourly)         — Phase 3
:11  every 12h     Regression Runner (NEW)   — Phase 6
:17  every 2h      Predict Hammer State      — Phase 5
:23  every 6h      Adversarial               — Phase 3
:31  every 4h      Advisory Eval             — Phase 4
:37  every 4h      Evaluate Predictions (NEW) — Phase 6
:43  every 6h      Weight Optimizer          — Phase 4
:52  every 15min   Compute System Health (NEW) — Phase 6
04:53 daily        Pattern extraction        — Phase 4
05:13 Sunday       User profile update       — Phase 4
04:37, 05:21, 05:42, 05:51 daily   Existing cleanup jobs
05:31, 05:38, 05:45, 05:55, 06:02 daily   New cleanup jobs (Phase 6 tables)
```
No collisions. Every minute slot occupied by at most one workload type.

---

## Files Created / Modified

**New migration** (1):
- 5 tables: `engine_snapshot_versions`, `engine_regression_results`, `engine_weight_history`, `prediction_outcomes`, `engine_system_health`
- RLS policies for all
- 5 cleanup functions (`cleanup_old_snapshot_versions`, `cleanup_old_regression_results`, `cleanup_old_weight_history`, `cleanup_old_prediction_outcomes`, `cleanup_old_system_health`)
- All indexes

**New edge functions** (5):
- `supabase/functions/engine-regression-runner/index.ts`
- `supabase/functions/evaluate-predictions/index.ts`
- `supabase/functions/compute-system-health/index.ts`
- `supabase/functions/engine-reset-safe-mode/index.ts`
- `supabase/functions/engine-chaos-test/index.ts`

**New hooks + UI** (1 hook, 2 component edits):
- `src/hooks/useSystemHealth.ts`
- `src/pages/EngineHealthDashboard.tsx` — append System Integrity badge + breakdown modal
- `src/components/owner/OwnerEngineSettingsPanel.tsx` — append Safe Mode + Chaos Test buttons

**Modified** (2):
- `supabase/functions/compute-hammer-state/index.ts` — single additive INSERT to `engine_snapshot_versions` after main snapshot insert
- `supabase/functions/engine-weight-optimizer/index.ts` — drift guard check + history INSERT after each upsert

**Config** (1):
- `supabase/config.toml` — add 5 entries: 3 new cron functions = `verify_jwt = false`; 2 admin functions = `verify_jwt = true`

**Cron schedules** (insert tool):
- `engine-regression-runner-12h`
- `evaluate-predictions-4h`
- `compute-system-health-15min`
- 5 cleanup-daily jobs (one per new table)

---

## Validation

1. **Reproducibility proof**: Trigger `compute-hammer-state` for owner → confirm new row in `engine_snapshot_versions` with non-empty `inputs`, `weights`, `output` JSONB
2. **Regression proof**: Manually invoke `engine-regression-runner` → confirm 50 rows in `engine_regression_results`, ≥90% pass rate baseline
3. **Drift guard proof**: Manually upsert 4 fake `engine_weight_adjustments` rows totaling delta 0.20 for the `recovery` axis in last 24h → invoke optimizer → confirm `audit_log` row with `action='weight_drift_blocked'`, NO change to `engine_dynamic_weights.recovery`
4. **Prediction accuracy proof**: Backdate one `engine_state_predictions` row to 25h ago → invoke `evaluate-predictions` → confirm `prediction_outcomes` row with non-null `accuracy_score`
5. **Health score proof**: Invoke `compute-system-health` → confirm `engine_system_health` row with score 0–100 + 6-component breakdown → visit `/engine-health` → confirm badge renders with correct color
6. **Safe mode proof**: Click "Engine Safe Mode" → confirm `engine_dynamic_weights` empty → trigger `compute-hammer-state` → confirm output identical to pre-Phase-4 baseline → confirm `audit_log` entry
7. **Chaos test proof**: Click "Run Chaos Test" → wait 30s → confirm `engine_dynamic_weights` restored to pre-test values → confirm result dialog shows perturbation impact

---

## Risk Assessment
- **Engine break risk**: zero — only one additive INSERT to compute-hammer-state, fire-and-forget
- **Optimizer regression risk**: zero — drift guard only prevents adjustments, never adds them
- **Safe mode misuse**: gated by admin role check in function + confirmation dialog. Worst case = engine reverts to baseline (which is current production behavior pre-Phase-4)
- **Chaos test risk**: 30s window of perturbed weights. Real users may see one-state shift. Auto-restored. Bounded by existing 0.5..1.5 weight clamp.
- **Storage**: snapshot_versions is the heaviest (~96 rows/day/active-user × 180d retention). For 100 active users: ~1.7M rows. Well within Postgres performance with the indexes. Can drop retention to 90d if needed.
- **Performance**: regression runner is the heaviest function (50 recomputations per run, 2x/day). Each recomputation is pure math, no DB writes. Estimated <500ms total per run.

---

## Open Decisions (best defaults; flag to override)
1. **`engine_version` = static `'v1.0.0'`** in this build. When you change MPI weights or thresholds in `ENGINE_CONTRACT.ts`, bump this manually. Could be derived from a config table later.
2. **Drift guard threshold = 0.15 cumulative abs delta / 24h / axis**. Tighter than per-run cap (0.05) so optimizer can run multiple times normally but spirals get blocked. Could tighten to 0.10.
3. **Regression pass threshold = drift_score ≤ 25** (single state-jump tolerance). Stricter would catch subtler drift; looser allows optimizer learning. Default = 25.
4. **System Health weights**: heartbeat/sentinel/adversarial/regression at 20% each, prediction/advisory at 10% each. Reflects "liveness + truth + resistance + reproducibility" as the foundation, with prediction/advisory as enhancements.
5. **Chaos test perturbation = ±0.10 per axis**. Small enough to stay within drift guard if it ran (though chaos bypasses optimizer entirely). Could be ±0.20 for harder stress.
6. **Safe Mode does NOT auto-disable optimizer cron**. Manual disable requires editing the cron schedule. (Spec says "optional flag" — defaulting to weights-only reset for surgical recovery.)

If any of those six are wrong, say so before approval and I'll adjust.

## Time Budget
- Build: ~20-25 minutes (1 migration, 5 edge functions, 1 hook, 2 UI edits, 2 function patches, 1 config edit, 8 cron schedules)
- Validation: ~10 minutes (full chain test + drift guard injection + UI verification)

## Cleanup
All 5 new tables auto-rotate (30–365d). Zero manual maintenance.

---

## Final State After Phase 6
| Layer | Question Answered |
|---|---|
| Heartbeat | Is it alive? |
| Sentinel | Is it right? |
| Adversarial | Can it be tricked? |
| Optimizer | Can it learn? |
| Predictor | Can it see ahead? |
| Interventions | Can it act early? |
| Snapshot Versioning | Can we replay any moment? |
| Regression Runner | Did learning improve or degrade? |
| Drift Guard | Can learning go runaway? *(no)* |
| Prediction Outcomes | Were forecasts correct? |
| System Health | One number, full truth |
| Safe Mode | Can we instantly recover? |
| Chaos Test | Is it stable under attack? |

Every layer reads from the previous, writes only to its own table. Engine remains the only mutator of `hammer_state_snapshots`. **No future feature can break the engine silently.**

