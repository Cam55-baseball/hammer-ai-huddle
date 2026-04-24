

# Adversarial Drift Engine — Reality Stress Testing Layer

## Objective
Move from "engine agrees with itself" → "engine cannot be tricked." Sentinel checks alignment between two models. Adversarial actively fabricates known-failure-pattern inputs and asserts the engine produces physiologically correct outputs.

---

## Architecture

A pg_cron job (every 6 hours) hits a new edge function `engine-adversarial`, which:
1. Iterates through 5 scripted scenarios on dedicated sandbox users
2. Cleans prior adversarial logs for that scenario+user (idempotent reset)
3. Inserts synthetic logs tagged `notes='adversarial:<scenario>'`
4. Triggers `hie-refresh-worker` + `compute-hammer-state` for the sandbox user
5. Reads latest `hammer_state_snapshots.overall_state`
6. Asserts result against scenario's expected/forbidden state set
7. Writes one row per scenario per run to `engine_adversarial_logs`
8. On fail → writes `audit_log` with `action='engine_adversarial_fail'`

**Boundary**: Adversarial layer only operates on dedicated sandbox users. Real users never see synthetic data.

---

## Components

### 1. Database Migration
**Table**: `engine_adversarial_logs`
```
id              uuid pk default gen_random_uuid()
run_at          timestamptz not null default now()
scenario        text not null      -- 'overload_spike' | 'fake_recovery' | 'stale_dominance' | 'low_load_high_readiness' | 'noise_chaos'
user_id         uuid not null      -- sandbox user used
expected_state  text not null      -- semantic intent (e.g. 'recover')
forbidden_states text[] not null   -- explicit fail-list (more robust than expected match)
actual_state    text               -- from hammer_state_snapshots after injection
pass            boolean not null
failure_reason  text               -- 'forbidden_state_returned' | 'no_snapshot' | 'pipeline_error' | 'timeout'
inputs          jsonb default '{}'::jsonb   -- log count, RPE distribution, time spread
engine_output   jsonb default '{}'::jsonb   -- full snapshot row (arousal/recovery/dopamine/motor/cognitive)
metadata        jsonb default '{}'::jsonb   -- run_id, sandbox_user_email, duration_ms
```
**Indexes**: `(run_at desc)`, `(pass, run_at desc)`, `(scenario, run_at desc)`
**RLS**: read = owner/admin only; insert = service role only
**Retention**: 90 days via `cleanup_old_adversarial_logs()` (additive)

### 2. Sandbox User Strategy — Critical Decision Point

**Three options; picking #2 with auto-bootstrap:**

| Option | Tradeoff |
|---|---|
| 1. Real owner user | Pollutes real metrics — REJECTED |
| 2. **Dedicated sandbox auth users (created via service role)** | **Clean isolation, fully automated** ✅ |
| 3. Filter `notes LIKE 'adversarial:%'` everywhere | Brittle — every aggregation needs the filter, easy to miss one |

**Implementation**: On first invocation, function checks for 3 sandbox users by deterministic email pattern:
- `adversarial-sandbox-1@hammers-system.local`
- `adversarial-sandbox-2@hammers-system.local`
- `adversarial-sandbox-3@hammers-system.local`

If missing, creates them via `supabase.auth.admin.createUser()` with random passwords, marks via `profiles.full_name = 'Adversarial Sandbox N'`, and adds rows to `athlete_mpi_settings` (sport='baseball'). Sandbox users:
- Are excluded from sentinel pool (will modify sentinel selection query to exclude `email LIKE '%@hammers-system.local'`)
- Are excluded from heartbeat aggregation alignment check
- Are excluded from real cohort analytics queries (one additive change to existing aggregation patterns: add to existing `notes != 'heartbeat'` filter)

**One sandbox user is rotated per scenario per run** to avoid cross-contamination — scenario N uses sandbox user `(N % 3) + 1`. Each run starts by deleting prior `notes LIKE 'adversarial:%'` logs for that user (clean slate).

### 3. Edge Function: `engine-adversarial`
**Location**: `supabase/functions/engine-adversarial/index.ts`
**Auth**: `verify_jwt = false` (cron + service role only)

**Per-scenario flow**:
```
A. RESET: DELETE custom_activity_logs WHERE user_id=sandbox AND notes LIKE 'adversarial:%'
   DELETE hie_snapshots/hammer_state_snapshots for sandbox user older than 1h (clean prior runs)

B. INJECT: scenario-specific log generation
   - overload_spike: 16 logs in last 6h, RPE 8-10, durations 30-60min, intervals ~20min
   - fake_recovery: 12 logs in last 12h (RPE 7-9) + jam profiles.last_sleep_quality=5, last_recovery_score=95
   - stale_dominance: 14 logs 20-26h ago (RPE 8-9), zero logs in last 12h
   - low_load_high_readiness: 1 log in last 48h (RPE 2, duration 10min) + sleep_quality=5
   - noise_chaos: 8 logs over last 24h with RPE pattern [3,9,2,8,4,9,3,7], jittered intervals

C. PIPELINE TRIGGER:
   - await invoke('hie-refresh-worker') — process dirty queue (sandbox user is auto-marked dirty by mark_hie_dirty trigger)
   - await invoke('compute-hammer-state', { user_id: sandbox_user_id })
   - poll hammer_state_snapshots for fresh row (max 30s, 2s interval)

D. EVALUATE:
   actual_state = latest hammer_state_snapshots.overall_state for sandbox user
   pass = actual_state IS NOT NULL AND actual_state NOT IN forbidden_states[scenario]
   - If actual_state is null after 30s polling → pass=false, failure_reason='timeout'

E. PERSIST:
   INSERT engine_adversarial_logs { all fields }
   IF NOT pass: INSERT audit_log { action='engine_adversarial_fail', metadata: {scenario, expected, actual, inputs} }

F. CLEANUP: Leave logs in place between runs (next run's RESET handles it). Sandbox snapshots stay for forensics.
```

**Scenario forbidden-state matrix**:
```ts
const FORBIDDEN: Record<string, string[]> = {
  overload_spike:           ['prime', 'ready'],          // must NOT say "go hard"
  fake_recovery:            ['prime'],                   // must NOT be fooled by sleep signal
  stale_dominance:          ['recover'],                 // must show recovery progressing (not still in recover)
  low_load_high_readiness:  ['recover', 'caution'],      // must NOT be conservative when fresh
  noise_chaos:              ['prime', 'recover'],        // must stabilize mid (no extremes)
};
```

**Why forbidden-states instead of expected-match**: The engine has 5 states (prime/ready/caution/recover/unknown). Strict equality is too brittle (adjacent states are often acceptable). Forbidden-list flags only the *clearly wrong* outputs — which is what "cannot be tricked" actually means.

**Failure isolation**: Each scenario wrapped in try/catch. One scenario's pipeline crash doesn't kill the run. Failed scenario gets row with `failure_reason='pipeline_error'` + error message in metadata.

### 4. pg_cron Schedule
```sql
select cron.schedule(
  'engine-adversarial-6h',
  '23 */6 * * *',  -- :23 every 6 hours (offset from heartbeat :00 and sentinel :07 to spread load)
  $$ select net.http_post(...engine-adversarial...) $$
);
select cron.schedule(
  'engine-adversarial-cleanup-daily',
  '37 4 * * *',  -- 4:37 UTC daily
  $$ select public.cleanup_old_adversarial_logs(); $$
);
```

### 5. Hook: `useAdversarialHealth.ts`
- `passRate24h` (% of scenario runs that passed)
- `runsToday` (total scenarios executed)
- `failuresByScenario` (object: scenario → count)
- `lastFailure` (single row with full inputs/output for inspection)
- `recentRuns` (last 30 rows for sparkline)
- Polls every 60s

### 6. Admin UI — Engine Health Dashboard Extension
New card after Sentinel card in `EngineHealthDashboard.tsx`:
- Title: "Adversarial Integrity (last 24h)"
- Metrics row: pass rate %, runs today, failures by scenario (5 small chips)
- Last failure: scenario badge + expected/forbidden vs actual + click-to-expand inputs+engine_output JSON
- Recent runs strip: 30 squares colored by pass (green) / fail (red) with scenario tooltip

### 7. Sentinel Pool Update (small additive change)
`engine-sentinel/index.ts` user-pool query gets one extra filter:
```sql
... AND user_id NOT IN (SELECT id FROM auth.users WHERE email LIKE '%@hammers-system.local')
```
Wrapped via a service-role lookup (sentinel already runs with service role) to keep the sandbox users pure synthetic test surface.

---

## Files Created/Modified

**Created** (4):
1. Migration: `engine_adversarial_logs` table + RLS + indexes + `cleanup_old_adversarial_logs()` function
2. `supabase/functions/engine-adversarial/index.ts` (orchestrator)
3. `supabase/functions/engine-adversarial/scenarios.ts` (5 scenario generators as pure functions, easy to audit/extend)
4. `src/hooks/useAdversarialHealth.ts`

**Modified** (3):
5. `src/pages/EngineHealthDashboard.tsx` — append Adversarial Integrity card
6. `supabase/config.toml` — add `[functions.engine-adversarial] verify_jwt = false`
7. `supabase/functions/engine-sentinel/index.ts` — exclude sandbox user emails from selection pool

**Cron schedule** (separate via insert tool, not migration):
- `engine-adversarial-6h`
- `engine-adversarial-cleanup-daily`

---

## Validation After Build

1. **Sandbox bootstrap**: First manual invocation creates 3 sandbox users → confirm via `auth.users` query
2. **Manual full run**: invoke `engine-adversarial` → confirm 5 rows in `engine_adversarial_logs`, distribution of pass/fail
3. **Expected initial failures**: 1-2 scenarios will likely fail on first run (especially `fake_recovery` since current engine may overweight sleep). This is the diagnostic value — it shows where engine logic needs hardening
4. **Re-run**: invoke again, confirm RESET cleans prior synthetic logs (no log accumulation on sandbox users beyond current scenario's injection)
5. **Verify isolation**: query `custom_activity_logs WHERE user_id != ANY(sandbox_ids) AND notes LIKE 'adversarial:%'` returns zero rows
6. **Verify sentinel exclusion**: confirm next sentinel run does not include sandbox users in evaluation pool
7. **UI check**: Adversarial card renders on `/engine-health` with real scenario breakdown

---

## Pre-Existing Constraints Honored
- ✅ No reserved schema modifications (auth via SDK admin API only — that's the sanctioned path for service-role user creation)
- ✅ Strictly additive — zero changes to `compute-hammer-state` or `hie-refresh-worker` logic; only consume their outputs
- ✅ Sandbox users cleanly tagged + excluded from real metrics
- ✅ Service-role only writes; owner/admin reads via RLS
- ✅ Cron offset from heartbeat (:00) and sentinel (:07) — no concurrent invocation collisions
- ✅ No CHECK constraints with time-based logic
- ✅ Adversarial logs auto-rotate after 90d

---

## Risk Assessment
- **Performance**: 5 scenarios × ~16 inserts × 2 pipeline invocations per scenario, every 6h = ~60 inserts/day + ~10 edge function invocations/day. Trivial.
- **Storage**: ~20 adversarial log rows/day × 90d = ~1800 rows max. Plus residual sandbox user activity logs (~80 rows × 3 sandbox users, constantly recycled). Negligible.
- **Pipeline contention**: Adversarial run takes ~30-60s wall time per scenario × 5 = 2.5-5 min total. Runs at :23 every 6h. Cannot collide with heartbeat (:00, :15, :30, :45) or sentinel (:07 hourly). Safe.
- **False positives**: Forbidden-state matrix may be overly strict. Rate-limited to 4 runs/day means false positives surface quickly but don't spam. Tunable per-scenario without code redeploy by editing the FORBIDDEN map.
- **Sandbox user pollution into real cohort queries**: Mitigated by deterministic email suffix (`@hammers-system.local`) — easy to filter wherever needed. Sentinel update is the only required filter; other aggregations don't currently filter by email so risk = sandbox users may show up in admin "user count" UI. Acceptable: 3 system users in admin counts is a known and labeled artifact.

---

## Open Decisions (using best defaults)
1. **Sandbox count = 3** rotating users. Could be 1 (cheaper, less isolation) or 5 (more parallelism, more bootstrap cost). 3 hits the sweet spot of one-per-frequent-scenario without contamination.
2. **Schedule = every 6h at :23**. Could be every 4h or every 12h. Every 6h = 4 runs/day, enough signal to catch regressions same-day, light enough not to noise-flood.
3. **Forbidden-state mode** instead of expected-match mode. Stronger semantics; more tolerant of acceptable adjacency.
4. **No alerting hook** in this build (matches Heartbeat and Sentinel pattern — fails surface in admin UI + audit_log).

If any of those four are wrong, say so before approval and I'll adjust.

## Time Budget
- Build: ~10-12 minutes (1 migration, 2 edge function files, 1 hook, 1 UI card, 1 config edit, 1 sentinel patch, 1 cron schedule, 1 sandbox bootstrap)
- Validation: ~5 minutes (manual run + verify expected partial failures + UI check)

## Cleanup
None required — auto-rotates after 90d.

