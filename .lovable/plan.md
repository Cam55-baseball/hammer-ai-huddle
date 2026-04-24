

# Phase 6 — Final Completion Plan (Execution-Only)

Strictly additive finishing pass. The 5 edge functions, the migration, and the 2 engine patches are already deployed. This plan covers the remaining 5%: config, cron, UI, owner controls, and validation.

---

## Pre-Flight Verification (read-only, will run during execution)

Before touching anything, confirm current state with read tools:
1. `code--view supabase/config.toml` — check which of the 5 functions are already registered
2. `supabase--read_query` on `cron.job` — check which schedules already exist
3. `code--view src/pages/EngineHealthDashboard.tsx` — confirm current structure
4. `code--view src/components/owner/OwnerEngineSettingsPanel.tsx` — confirm current structure
5. `supabase--read_query` on `engine_system_health`, `engine_snapshot_versions`, `engine_regression_results` — confirm tables exist and are empty/seeded

If any item already exists, skip its creation step. No duplicates.

---

## SECTION 1 — Config Finalization

**File**: `supabase/config.toml`

Append these 5 entries (only if missing — pre-flight will confirm):
```toml
[functions.engine-regression-runner]
verify_jwt = false

[functions.evaluate-predictions]
verify_jwt = false

[functions.compute-system-health]
verify_jwt = false

[functions.engine-reset-safe-mode]
verify_jwt = true

[functions.engine-chaos-test]
verify_jwt = true
```
Verification: re-view file, confirm exactly 5 new blocks, no typos, no duplicates.

---

## SECTION 2 — Cron Schedule Completion

Use the **Supabase insert tool** (NOT migration — schedules are project-specific and contain anon keys). 8 schedules total:

```sql
-- Logic runners
SELECT cron.schedule('engine-regression-runner-12h', '11 */12 * * *', $$
  SELECT net.http_post(
    url:='https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/engine-regression-runner',
    headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body:=jsonb_build_object('triggered_at', now())
  );
$$);

SELECT cron.schedule('evaluate-predictions-4h', '37 */4 * * *', $$ ... $$);
SELECT cron.schedule('compute-system-health-15min', '52 * * * *', $$ ... $$);

-- Cleanup jobs (call SQL functions directly, no HTTP)
SELECT cron.schedule('cleanup-snapshot-versions',   '31 5 * * *', $$ SELECT public.cleanup_old_snapshot_versions(); $$);
SELECT cron.schedule('cleanup-regression-results',  '38 5 * * *', $$ SELECT public.cleanup_old_regression_results(); $$);
SELECT cron.schedule('cleanup-weight-history',      '45 5 * * *', $$ SELECT public.cleanup_old_weight_history(); $$);
SELECT cron.schedule('cleanup-prediction-outcomes', '55 5 * * *', $$ SELECT public.cleanup_old_prediction_outcomes(); $$);
SELECT cron.schedule('cleanup-system-health',       '02 6 * * *', $$ SELECT public.cleanup_old_system_health(); $$);
```

Pre-flight will check `cron.job WHERE jobname IN (...)`. If a name already exists, `SELECT cron.unschedule('name'); SELECT cron.schedule(...);` to ensure the schedule matches spec exactly.

Verification: post-insert query to `cron.job` confirms all 8 jobs present with correct schedules and no collisions with existing slots (`:00,:07,:11,:15,:17,:23,:30,:31,:37,:43,:45,:52,:55`).

---

## SECTION 3 — System Health UI

### New file: `src/hooks/useSystemHealth.ts`
- Fetches latest `engine_system_health` row via Supabase client
- Subscribes to realtime INSERTs on the table for the dashboard channel
- Also fetches last 20 rows for sparkline data (per component breakdown)
- Returns: `{ score, breakdown, history, loading, error }`
- Graceful degrade: if no rows → `{ score: null, breakdown: null, history: [], loading: false }`

### Modify: `src/pages/EngineHealthDashboard.tsx`
- Add top-of-page integrity badge: `<SystemIntegrityBadge />` above existing dashboard content
- Badge displays `System Integrity: {score}/100` with color logic:
  - `≥ 90` → green (`bg-green-500/15 text-green-700 border-green-500/30`)
  - `75–89` → amber (`bg-amber-500/15 text-amber-700 border-amber-500/30`)
  - `< 75` → red (`bg-destructive/15 text-destructive border-destructive/30`)
  - `null` → muted gray, label "No data yet"
- Click → opens `<SystemIntegrityModal />` (Dialog) showing:
  - 6 component scores (heartbeat, sentinel, adversarial, regression, prediction, advisory) as percentages
  - Inline sparkline (using lightweight inline SVG, last 20 points) per component
  - Sample size for each
  - Empty-state per component if its source returned null

### New helper component: `src/components/owner/SystemIntegrityBadge.tsx`
Self-contained badge + modal trigger. Uses the hook.

---

## SECTION 4 — Owner Controls

### Modify: `src/components/owner/OwnerEngineSettingsPanel.tsx`
Add a new "Recovery & Stress Testing" section below existing tabs (or as a third tab). Two destructive buttons gated by existing `isOwner` check:

**Safe Mode button**:
- Red destructive variant
- Label: "Engine Safe Mode (Instant Reset)"
- Click → opens AlertDialog with:
  - Warning text
  - Optional checkbox: "Also reset user engine profiles"
- Confirm → `supabase.functions.invoke('engine-reset-safe-mode', { body: { reset_profiles: bool }})`
- Success toast + refresh local settings state (no page reload)
- Error toast on failure

**Chaos Test button**:
- Amber/outline variant
- Label: "Run Chaos Test"
- Click → opens AlertDialog explaining 30s perturbation
- Confirm → `supabase.functions.invoke('engine-chaos-test')`
- Show loading state for ~35s
- Display result Dialog with:
  - `baseline_weights` (JSON pretty-print)
  - `chaos_weights` (JSON pretty-print)
  - `sentinel_drifts` count
  - `adversarial_fails` count
  - `restored: true` confirmation
- Error toast on failure

Both buttons render only when `isOwner === true` (already enforced by parent route).

---

## SECTION 5 — Final System Validation

Execute via tools, in order:

1. **Snapshot Versioning**:
   - `supabase--curl_edge_functions` POST `/compute-hammer-state` for owner user
   - `supabase--read_query`: `SELECT * FROM engine_snapshot_versions ORDER BY created_at DESC LIMIT 1`
   - Assert: `inputs != '{}'`, `weights IS NOT NULL`, `output->>'overall_state' IS NOT NULL`

2. **Regression Engine**:
   - `supabase--curl_edge_functions` POST `/engine-regression-runner`
   - `supabase--read_query`: `SELECT count(*), count(*) FILTER (WHERE pass=true) FROM engine_regression_results WHERE run_at > now() - interval '5 min'`
   - Assert: count > 0, pass_rate ≥ 0.90 (or document if baseline is lower because no historical seed data)

3. **Drift Guard**:
   - Insert 4 fake `engine_weight_history` rows for `recovery` axis with deltas summing to 0.16 in last 24h
   - `supabase--curl_edge_functions` POST `/engine-weight-optimizer`
   - `supabase--read_query`: `SELECT * FROM audit_log WHERE action='weight_drift_blocked' ORDER BY created_at DESC LIMIT 5`
   - Assert: row exists, `engine_dynamic_weights.recovery` unchanged
   - Cleanup: `DELETE FROM engine_weight_history WHERE metadata->>'test'='drift_guard'`

4. **Prediction Outcome**:
   - Find or insert one `engine_state_predictions` row backdated 25h
   - `supabase--curl_edge_functions` POST `/evaluate-predictions`
   - `supabase--read_query`: `SELECT * FROM prediction_outcomes ORDER BY created_at DESC LIMIT 1`
   - Assert: `accuracy_score IN (0,40,70,100)`

5. **System Health**:
   - `supabase--curl_edge_functions` POST `/compute-system-health`
   - `supabase--read_query`: `SELECT score, breakdown FROM engine_system_health ORDER BY created_at DESC LIMIT 1`
   - Assert: score 0–100, breakdown has 6 keys
   - UI: confirm badge renders (visual via session replay if needed)

6. **Safe Mode** (admin only):
   - Snapshot current `engine_dynamic_weights` to local var
   - `supabase--curl_edge_functions` POST `/engine-reset-safe-mode` with auth header (owner JWT)
   - `supabase--read_query`: `SELECT count(*) FROM engine_dynamic_weights` → expect 0
   - `supabase--read_query`: `SELECT * FROM audit_log WHERE action='safe_mode_enabled' ORDER BY created_at DESC LIMIT 1` → expect row
   - Trigger compute-hammer-state, confirm output uses `?? 1` defaults (engine alive)

7. **Chaos Test** (admin only):
   - `supabase--curl_edge_functions` POST `/engine-chaos-test` with auth header
   - Wait via `project_debug--sleep` 35s
   - `supabase--read_query`: `SELECT * FROM audit_log WHERE action='chaos_test_completed' ORDER BY created_at DESC LIMIT 1`
   - Confirm response JSON has `restored: true`, weights match pre-test snapshot

---

## SECTION 6 — Hard Guarantees Verification

After validation:
1. `supabase--read_query`: `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('engine_snapshot_versions','engine_regression_results','engine_weight_history','prediction_outcomes','engine_system_health')` — all `rowsecurity=true`
2. `supabase--read_query`: `SELECT indexname FROM pg_indexes WHERE tablename IN (...)` — confirm indexes per spec
3. `supabase--read_query`: `SELECT proname FROM pg_proc WHERE proname LIKE 'cleanup_old_%'` — confirm 5 new cleanup functions
4. Re-run compute-hammer-state with empty `engine_dynamic_weights` (already empty post-safe-mode test) — confirm output identical to pre-Phase-4 baseline math
5. Confirm no advertised latency > +20ms (timing logs from edge function)

---

## Files Created / Modified

**New** (3):
- `src/hooks/useSystemHealth.ts`
- `src/components/owner/SystemIntegrityBadge.tsx`
- (Optional) `src/components/owner/SystemIntegrityModal.tsx` — could be inline in badge

**Modified** (3):
- `supabase/config.toml` — append 5 function entries
- `src/pages/EngineHealthDashboard.tsx` — append top-level badge
- `src/components/owner/OwnerEngineSettingsPanel.tsx` — append Safe Mode + Chaos Test buttons

**Cron** (insert tool, 8 schedules)

---

## Risk Assessment
- Config: zero risk (declarative entries, no runtime impact for already-deployed functions)
- Cron: low risk — new schedules at unused offsets (`:11`, `:37`, `:52`, plus daily 5:31/5:38/5:45/5:55/6:02). Pre-flight confirms no name collisions.
- UI: zero risk — graceful degrade when tables empty
- Owner controls: gated by existing isOwner check + AlertDialog confirmations
- Validation: drift guard test inserts fake history rows tagged `metadata.test='drift_guard'` for clean removal

## Time Budget
- Build: ~12-15 minutes (1 config edit, 8 cron inserts, 1 hook, 2 UI edits)
- Validation: ~10 minutes (7-step test chain + sleep 35s for chaos)

## Open Decisions (best defaults; flag to override)
1. **Sparkline implementation** = inline SVG in badge modal, no chart library dependency. Keeps bundle small.
2. **Safe Mode button placement** = third tab "Recovery" in `OwnerEngineSettingsPanel` (alongside HIE + Recap). Cleaner than appending to existing tab.
3. **Chaos test wait** = `project_debug--sleep(35)` after invoke (function takes 30s + buffer). Could poll `audit_log` instead but sleep is simpler.
4. **Pre-flight skip behavior** = if a config entry already exists, skip the append (no duplicate); if a cron job name exists with same schedule, skip; if same name different schedule, unschedule + reschedule.
5. **Drift guard validation** = simulate via `engine_weight_history` inserts (not `engine_weight_adjustments`), since the optimizer's drift guard reads `engine_weight_history` for cumulative deltas.

If any of these are wrong, say so before approval.

