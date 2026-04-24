# Phase 8 — System Boundary Lock-In (Approved Execution)

Execute Steps 1–8 in order. All final constraints from user message incorporated.

## Step 1 — Create dedicated system user
- Insert into `auth.users` with fixed UUID `00000000-0000-0000-0000-000000000001`, email `system@hammer.internal`, no password.
- Add `is_system_account boolean DEFAULT false` to `profiles`.
- Seed system user `profiles` row (`full_name='System'`, `sport='baseball'`, `date_of_birth='2000-01-01'`, `is_system_account=true`).

## Step 2 — Migrate engine writers to system user
- `engine-heartbeat/index.ts`: `HEARTBEAT_USER_ID = '00000000-0000-0000-0000-000000000001'`.
- `engine-adversarial`: read first; migrate sandbox user IDs to system user.
- `engine-sentinel`: read first; migrate if it writes activity logs.
- `hie-refresh-worker`: exclude system user from enumeration.
- Deploy all modified functions.

## Step 3 — Pre-purge audit + hard delete + Truth Reset
- `INSERT INTO audit_log` with pre-purge count (heartbeat / kill v3 / adversarial rows on real users).
- `DELETE FROM custom_activity_logs WHERE user_id != system_uuid AND template_id IS NULL AND (notes='heartbeat' OR notes LIKE 'kill v3 %' OR notes LIKE 'adversarial:%' OR notes LIKE 'sentinel:%')`.
- Post-purge audit count.
- **Truth reset**: invoke `compute-hammer-state` for owner (`95de827d-7418-460b-8b79-267bf79bdca4`) to refresh completions_last_6h / MPI / Hammer State.
- Clean up the 2 stray `instance_index > 0` rows.

## Step 4 — Structural triggers (ENHANCED per user request)
Trigger 1 — `enforce_structural_invariants_for_real_users`:
```
IF NEW.user_id != system_uuid THEN
  IF NEW.template_id IS NULL THEN RAISE; END IF;
  IF NEW.instance_index != 0 THEN RAISE; END IF;
END IF;
```

Trigger 2 — `block_synthetic_writes_on_real_users`:
- Block notes IN ('heartbeat') OR LIKE 'adversarial:%' / 'kill v3 %' / 'sentinel:%' for non-system users.

## Step 5 — Cleanup lifecycle
- `cleanup_synthetic_activity_logs()` deletes system-user rows >24h old.
- pg_cron hourly schedule.

## Step 6 — Heartbeat self-validation update
- Verify heartbeat still works end-to-end against system user (profile is seeded, so `compute-hammer-state` won't crash).

## Step 7 — Realtime monotonic merge (`useCustomActivities.ts`)
- Add `mergeMonotonic(current, incoming)` using `updated_at` comparison.
- Apply to `fetchTodayLogs` post-merge and realtime payload handlers.
- DELETE events apply unconditionally.

## Step 8 — Verification
- Test insert: `(real_user_id, template_id=NULL, ...)` → MUST FAIL.
- Test insert: `(real_user_id, template_id=valid, instance_index=1)` → MUST FAIL.
- Test insert: `(real_user_id, template_id=valid, notes='heartbeat')` → MUST FAIL.
- Confirm 0 contaminated rows on real users.
- Confirm heartbeat success on system user via `engine_heartbeat_logs`.
- Confirm cleanup cron scheduled.

## Definition of Done (report)
- Pre-purge count (logged)
- Post-purge count = 0 (verified)
- All 2 triggers firing (3 negative-case tests pass)
- Heartbeat success on system user (latest `engine_heartbeat_logs` row, success=true)
- Owner Hammer State recomputed post-purge

## Files modified
- 4 edge functions: engine-heartbeat, engine-adversarial, engine-sentinel, hie-refresh-worker
- 1 hook: src/hooks/useCustomActivities.ts (monotonic merge)
- 1 schema migration (system user, profile column, 2 triggers, cleanup function)
- 1 data migration (purge + truth reset + cron schedule)
