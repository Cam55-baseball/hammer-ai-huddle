
## Phase II — Final hardening validation (read/test only, no code changes)

All steps below are observation-only or use temporary seeded rows that I clean up at the end. No edge-function or schema edits.

### 1. Concurrent notification idempotency
- Read current `uq_fnd_idem_minute` definition with `pg_indexes` to confirm column set `(alert_key, adapter, minute_bucket)`.
- Spin up 10 parallel POSTs to a tiny ad-hoc Deno script (run via `code--exec deno run`) that imports `dispatch()` directly with stubbed `fetch` (counts call count) and a real Supabase client pointed at the project. All 10 share the same `alert_key` + minute.
- Evidence: `select alert_key, adapter, minute_bucket, count(*) from foundation_notification_dispatches where alert_key='__idem_test__' group by 1,2,3` → expect ≤1 `ok`/`dlq` per (adapter, minute), with the rest as `skipped_idem`/`skipped_flap`. Stubbed-fetch call count printed.
- Cleanup: `delete from foundation_notification_dispatches where alert_key='__idem_test__'` (via migration tool since delete requires write).

### 2. Notification timeout isolation
- Run a local Deno harness that sets `FOUNDATION_NOTIFICATIONS_ENABLED=true`, `SLACK_WEBHOOK_URL` pointing at a hanging local server (`Deno.serve(() => new Promise(() => {}))`), then awaits `dispatch(...)` and records wall time.
- Evidence: wall time < 21 s (DISPATCH_DEADLINE_MS=20 s + ~1 s overhead); returned `results` show `ok:false, error:'outer_timeout'` or per-attempt timeout strings; process exits cleanly (no leaked timers — verified by `--trace-leaks`-equivalent: re-running with `sanitizeOps:true` test wrapper).

### 3. Retry-bound verification
- Same harness, hanging server replaced with a counter that always returns 500.
- Evidence: stubbed server logs exactly 3 hits per adapter; `dispatch` returns `attempts:3, ok:false`; one `dlq` row written per adapter for that minute bucket; no further hits after `MAX_ATTEMPTS`.

### 4. Query/index verification under volume
- Seed via `supabase--insert`:
  - 10 000 rows into `foundation_health_alerts` with `resolved_at` spanning last 30 d, varied `severity`, `alert_key` patterns.
  - 5 000 rows into `foundation_replay_outcomes` over last 7 d, ~10 % `matched=false`.
  - 5 000 rows into `foundation_notification_dispatches`.
- Run `EXPLAIN (ANALYZE, BUFFERS)` via `supabase--read_query` on:
  1. Resolved-alerts pagination (`severity='critical'` + `ilike 'cron_%'` + `range(0,25)`).
  2. Replay drift trend (`ran_at >= now() - 7d`).
  3. Mismatch samples (`matched=false order by ran_at desc limit 20`).
  4. Dispatch lookup (`alert_key=? and adapter=? and status='ok' gte dispatched_at`).
- Evidence: report `Index Scan` lines + `Execution Time` for each. Flag any `Seq Scan` on the four target tables.
- Cleanup migration deletes all `__seed__`-prefixed rows.

### 5. Cron overlap safety
- Issue 5 parallel `supabase--curl_edge_functions POST /foundation-health-alerts` and 5 parallel `POST /foundation-alert-retention`.
- Evidence:
  - `select alert_key, count(*) from foundation_health_alerts where resolved_at is null group by 1 having count(*) > 1` → expect empty (uq_fha_open_key holds).
  - `select count(*) filter (where status='ok'), count(*) filter (where status='error') from foundation_cron_heartbeats where ran_at >= now() - interval '5 min' and function_name in ('foundation-health-alerts','foundation-alert-retention')`.
  - `select count(*) from foundation_health_alerts where resolved_at >= now() - interval '5 min'` (sanity — must not spike).
  - Retention: `select max(resolved_at) from foundation_health_alerts where resolved_at < now() - interval '90 days'` before vs after — should be unchanged because no resolved rows exist beyond cutoff in seeded data; deletion count from each invocation logged in heartbeat metadata.

### 6. Final report contents
- Commands executed (exact).
- Tool outputs verbatim (truncated only at >2 k chars, with note).
- EXPLAIN plans + timings.
- Wall-time measurements for §2 and §3.
- pg_indexes proof.
- Discovered risks (if any).
- Go / No-Go recommendation with explicit conditions.

### What I will NOT do
- No code edits.
- No threshold changes.
- No new tests committed (the harness scripts run from `/tmp` and are not added to the repo).
- Seeded rows are deleted in a final cleanup migration.

### Confirm before I run
- OK to seed ~20 k temporary rows then delete them?
- OK to insert ~30 ad-hoc `foundation_notification_dispatches` rows under `alert_key='__idem_test__'` for §1?
