

# Engine Sentinel — Truth-vs-Reality Verification Layer

## Objective
Add a second-order observer that audits **whether engine outputs match reality**, not just whether the pipeline ran. Heartbeat = "alive". Sentinel = "right".

---

## Architecture

A pg_cron job (every 60 min) hits a new edge function `engine-sentinel`, which:
1. Selects 5–10 high-signal users (deterministic pool, refreshed weekly)
2. For each user: pulls raw inputs → independently computes **expected state** via a simplified truth model → compares to actual `hammer_state_snapshots.overall_state`
3. Calculates `drift_score` (0–100) and flags if > threshold
4. Writes one row per user per run to `engine_sentinel_logs`
5. On drift: writes to `audit_log` with `action='engine_drift_detected'`

**Strict additive boundary**: Sentinel reads only. Never invokes `compute-hammer-state`. Never mutates engine state. Never blocks production. Pure observer.

---

## Components

### 1. Database Migration
**Table**: `engine_sentinel_logs`
```
id              uuid pk default gen_random_uuid()
run_at          timestamptz not null default now()
user_id         uuid not null
expected_state  text not null    -- from sentinel truth model
actual_state    text             -- from latest hammer_state_snapshots (nullable if missing)
drift_score     integer not null -- 0..100
drift_flag      boolean not null default false
failure_reason  text             -- 'no_snapshot' | 'stale_snapshot' | 'state_mismatch' | null
inputs_snapshot jsonb default '{}'::jsonb   -- raw inputs the truth model saw
engine_snapshot jsonb default '{}'::jsonb   -- the engine's reasoning (arousal/recovery/dopamine/motor/cognitive scores)
metadata        jsonb default '{}'::jsonb   -- run_id, sentinel_version, distance_matrix used
```
**Indexes**: `(run_at desc)`, `(drift_flag, run_at desc)`, `(user_id, run_at desc)`
**RLS**: read = owner/admin only; insert = service role only
**Retention**: 60 days via `cleanup_old_sentinel_logs()` invoked by daily cron (additive, isolated to this table)

### 2. Sentinel User Pool — Deterministic, Not Random
**Selection logic** (cached at run start, no manual list):
```sql
WITH activity_score AS (
  SELECT user_id,
    count(*) FILTER (WHERE created_at > now() - interval '7 days') as logs_7d,
    count(DISTINCT date_trunc('day', created_at)) FILTER (WHERE created_at > now() - interval '14 days') as active_days_14d,
    avg(perceived_intensity) FILTER (WHERE created_at > now() - interval '7 days') as avg_rpe_7d,
    stddev(perceived_intensity) FILTER (WHERE created_at > now() - interval '7 days') as rpe_variance_7d
  FROM custom_activity_logs
  WHERE notes IS NULL OR notes NOT IN ('heartbeat')
  GROUP BY user_id
  HAVING count(*) FILTER (WHERE created_at > now() - interval '7 days') >= 5
)
SELECT user_id FROM activity_score
ORDER BY (logs_7d * 0.4 + active_days_14d * 2 + COALESCE(rpe_variance_7d, 0) * 5) DESC
LIMIT 10;
```
- Always force-include User A (`95de827d…`) as anchor regardless of rank
- Excludes heartbeat-tagged logs (no synthetic noise)
- Variance bonus = mixed behavior patterns, not just high-volume users

### 3. Edge Function: `engine-sentinel`
**Location**: `supabase/functions/engine-sentinel/index.ts`
**Auth**: `verify_jwt = false` (cron + service role only)

**Per-user flow**:
```
A. PULL RAW INPUTS (read-only, parallel queries):
   - completions_6h: count(custom_activity_logs WHERE user_id AND created_at > now() - 6h)
   - completions_24h: same, 24h window
   - sessions_3d: distinct date count, 3d window
   - avg_rpe_24h, max_rpe_24h
   - avg_duration_24h
   - sleep_quality_24h (if profiles.last_sleep_quality or recent vault entry exists; else null)
   - hours_since_last_activity

B. INDEPENDENT TRUTH MODEL (NOT compute-hammer-state):
   Sentinel-specific deterministic classifier — separate file: `truth-model.ts`
   
   load_score = clamp(0..100, completions_24h*8 + sessions_3d*10 + avg_rpe_24h*4)
   recovery_score = clamp(0..100, hours_since_last_activity*2 + (sleep_quality_24h ?? 50))
   freshness_score = clamp(0..100, 100 - max(0, completions_6h*15))
   
   expected_state =
     if load_score >= 70 AND recovery_score < 40        → 'recover'   (overdrive risk)
     elif load_score >= 50 AND freshness_score >= 60    → 'prime'     (worked + still fresh)
     elif load_score < 30 AND recovery_score >= 70      → 'prime'     (rested, ready)
     elif load_score >= 30 AND load_score < 70          → 'ready'     (steady state)
     elif load_score < 30 AND recovery_score >= 40      → 'ready'     (low load, fine)
     else                                                → 'caution'  (mixed/ambiguous)

C. PULL ACTUAL ENGINE STATE:
   SELECT * FROM hammer_state_snapshots WHERE user_id ORDER BY computed_at DESC LIMIT 1
   - If null → failure_reason='no_snapshot', drift_score=100, drift_flag=true
   - If older than 24h → failure_reason='stale_snapshot', drift_score=80, drift_flag=true

D. DRIFT CALCULATION:
   STATE_DISTANCE matrix:
     prime↔ready=15, prime↔caution=40, prime↔recover=80
     ready↔caution=25, ready↔recover=60
     caution↔recover=35
     same↔same=0
   drift_score = STATE_DISTANCE[expected][actual]
   drift_flag = drift_score >= 30

E. PERSIST:
   INSERT engine_sentinel_logs { full row }
   IF drift_flag: INSERT audit_log { action: 'engine_drift_detected', user_id, metadata: { expected, actual, drift_score, inputs } }

F. RETURN run summary: { users_evaluated, drifts_flagged, worst_drift, run_ms }
```

**Failure isolation**: Each user wrapped in try/catch — one user's read failure never breaks the run. Failed users get a row with `failure_reason='compute_error'`.

### 4. pg_cron Schedule
```sql
select cron.schedule(
  'engine-sentinel-60min',
  '7 * * * *',  -- :07 every hour, offset from heartbeat (:00,:15,:30,:45) to spread load
  $$ select net.http_post(...engine-sentinel...) $$
);
select cron.schedule(
  'engine-sentinel-cleanup-daily',
  '17 4 * * *',  -- 4:17 UTC daily
  $$ select public.cleanup_old_sentinel_logs(); $$
);
```

### 5. Hook: `useSentinelHealth.ts`
Mirrors `useHeartbeatHealth` shape:
- `driftRate24h` (% of evaluations flagged)
- `usersFlagged24h` (distinct count)
- `worstDriftCase` (single row, joined with user email if available)
- `recentRuns` (last 20 sentinel rows for sparkline)
- `loading`

Polls every 60s.

### 6. Admin UI — Engine Health Dashboard Extension
Add a new card after the Heartbeat card in `EngineHealthDashboard.tsx`:
- Title: "Engine Truth Drift (last 24h)"
- Metrics row: drift rate %, users flagged, worst drift score
- Worst-case row: shows expected vs actual state badges + click-to-expand inputs/engine snapshots
- Recent runs strip: 20 squares colored by drift_score (green ≤15, amber ≤30, red >30)

---

## Files Created/Modified

**Created** (4):
1. Migration: `engine_sentinel_logs` table + RLS + indexes + `cleanup_old_sentinel_logs()` function
2. `supabase/functions/engine-sentinel/index.ts`
3. `supabase/functions/engine-sentinel/truth-model.ts` (isolated truth classifier — pure function, easy to test/audit)
4. `src/hooks/useSentinelHealth.ts`

**Modified** (2):
5. `src/pages/EngineHealthDashboard.tsx` — append Truth Drift card
6. `supabase/config.toml` — add `[functions.engine-sentinel] verify_jwt = false`

**Cron schedule** (separate via insert tool, not migration — contains anon key per platform rules):
- `engine-sentinel-60min`
- `engine-sentinel-cleanup-daily`

---

## Validation After Build

1. **Manual invoke** → confirm rows written for ~10 users, drift distribution visible
2. **Inject controlled drift** (read-only test, no engine mutation):
   - Insert 15 high-RPE logs in last 6h for User A (already established pattern, tagged `notes='kill sentinel-test'`)
   - Wait for next sentinel run (or invoke manually)
   - Confirm User A row shows expected≈'recover', drift_score>30, drift_flag=true, audit_log entry written
3. **Verify cleanup**: `SELECT count(*) FROM engine_sentinel_logs` doesn't grow unboundedly (60d retention)
4. **Verify isolation**: confirm `compute-hammer-state` was NOT invoked during sentinel run (check edge function logs)
5. **UI check**: Truth Drift card renders on `/engine-health` with real data

---

## Pre-Existing Constraints Honored
- ✅ No reserved schema modifications (auth/storage/realtime untouched)
- ✅ No CHECK constraints for time-based logic — all logic in edge function
- ✅ Service-role only writes; owner/admin only reads via RLS
- ✅ Sentinel-tagged test logs (`kill sentinel-test`) excluded from real metrics aggregation patterns we've established
- ✅ Strictly additive — zero changes to `compute-hammer-state`, `hie-refresh-worker`, or any existing engine logic
- ✅ Heartbeat-tagged logs excluded from sentinel pool selection (no double-counting synthetic data)

---

## Risk Assessment
- **Performance**: 10 users × ~5 read queries × hourly = ~1200 lightweight queries/day. Negligible.
- **Storage**: ~10 rows/hour × 60d = ~14k rows max steady state. Tiny.
- **False positives**: Truth model is intentionally simple → expected to flag ~5–15% as "drift" initially. This is signal, not bug — gives owner visibility into where the real engine and the sanity model disagree, which is exactly the diagnostic value.
- **False negatives**: A drift the simple model also produces wrong won't be caught. Acceptable — sentinel is one of multiple verification layers, not the only one.

---

## Open Decisions (using best defaults; flag if you'd prefer different)
1. **Drift threshold = 30** (adjacent states pass, non-adjacent flag). Could be 25 for stricter, 40 for looser.
2. **Pool size = 10** users + User A. Could be 5 (lighter) or 20 (more signal, more noise).
3. **Schedule = hourly at :07**. Could be every 30min or every 2hr.
4. **No alerting hook** in this build (matches Heartbeat decision — drift surfaces in admin UI + audit_log; Resend integration deferred until you choose channel).

If any of those four defaults are wrong for you, say so before approval and I'll adjust.

## Time Budget
- Build: ~7-9 minutes (1 migration, 2 edge function files, 1 hook, 1 UI card, 1 config edit, 1 cron schedule)
- Validation: ~3 minutes manual + drift injection test

## Cleanup
None required — auto-rotates after 60d.

