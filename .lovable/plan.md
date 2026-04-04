

# Absolute Certainty — Observable, Chaos-Tested, Continuously Verified

## 1. Migration: Instrumented Trigger Function

Replace `enforce_session_global_uniqueness()` with the user's provided version that logs violations to `audit_log` before raising the exception. Key additions:

- `SECURITY DEFINER` + `SET search_path = public`
- `SELECT id INTO v_conflict` to capture the conflicting link
- `INSERT INTO audit_log` with action `link_violation_creator` or `link_violation_joiner` before `RAISE EXCEPTION`
- Uses `auth.uid()` for the user_id column (will be null in SECURITY DEFINER context from RPCs — we should use `COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)` to avoid null constraint issues)

## 2. Edge Function: Nightly Invariant Check

Create `supabase/functions/verify-link-integrity/index.ts`:

- Runs the session uniqueness query (UNION ALL of creator + joiner, GROUP BY HAVING COUNT > 1)
- If violations found → logs to `audit_log` with action `link_integrity_violation`
- If clean → logs `link_integrity_pass`
- Returns JSON result

Schedule via pg_cron to run daily.

## 3. Chaos Test (One-Time Proof)

Run a DO block migration that:
- Creates a test link
- Attempts 10 sequential attach calls with the same session (simulating concurrency within SQL — true parallel requires client-side, but sequential proves idempotency)
- Verifies final count = 1
- Logs result to `audit_log` with action `chaos_test_result`
- Cleans up test data

Note: True parallel Promise.all testing would need to be run from a client script, not a migration. The migration proves idempotency; the trigger + FOR UPDATE prove race safety.

## Files Changed

| File | Change |
|------|--------|
| New migration | Replace trigger function with instrumented version; chaos test DO block |
| `supabase/functions/verify-link-integrity/index.ts` | New edge function for nightly invariant check |
| `supabase/config.toml` | Add `[functions.verify-link-integrity]` with `verify_jwt = false` |
| pg_cron schedule (via insert tool) | Schedule daily call to `verify-link-integrity` |

## What Does NOT Change
- `attach_session_to_link` — unchanged
- `claim_ab_link`, `create_ab_link` — unchanged
- Client code — unchanged
- Unique indexes — unchanged

