# Phase II — Controlled Rollout + Operational Readiness

Phase I behavior preserved. No threshold changes, no UX redesign, no new analytics domains.

## 1. Documentation (`docs/foundations/`)

New files (markdown only):
- `runbook.md` — env vars, alert lifecycle, replay-drift interpretation, retention, rollback, troubleshooting
- `cron-inventory.md` — table of every cron job: name, schedule, target function, owner, max-stale-min, on-failure action
- `notification-enablement.md` — step-by-step enable order: secrets → flag flip on staging → verify → flag flip on prod
- Append `runbook.md` link to existing `README.md`

No code references touched.

## 2. Admin observability additions (Dashboard only)

`FoundationHealthDashboard.tsx` — additive panels below existing layout. No restructuring.
- **Resolved alerts (last 30d)** card: paginated 25/page, severity dropdown (`all | critical | warning | info`), alert-key search input (debounced 300ms). Bounded query: `.gte('resolved_at', t-30d).order('resolved_at',{ascending:false}).range(p, p+24)`. Empty/error/loading states.
- **Replay drift trend** card: 7×24h buckets from `foundation_replay_outcomes`, single SVG sparkline (no chart lib), bounded `.gte('ran_at', t-7d).limit(20_000)`.
- **Last-N replay mismatch samples** table: top 20 most-recent `matched=false` rows, columns `ran_at | trace_id | drift_reason | original→replay`. Bounded `.eq('matched', false).limit(20)`.

Indexes (migration): `idx_fha_resolved_severity` `(severity, resolved_at desc) where resolved_at is not null`, `idx_fha_alert_key_trgm` (gin_trgm_ops) — only if pg_trgm available; otherwise plain btree on `alert_key`.

## 3. Notification delivery (gated, critical-only)

`supabase/functions/_shared/notificationAdapters.ts` — replace stubs with real implementations:
- `slackAdapter`: `fetch(SLACK_WEBHOOK_URL, { method:'POST', body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) })`
- `emailAdapter`: invokes existing `send-transactional-email` with `templateName='foundation-alert'` (new template) to `FOUNDATION_ALERT_EMAIL_TO`
- `dispatch()`: 
  - Severity gate: critical-only (warning/info skipped even when enabled)
  - **Flapping suppression**: skip if same `alert_key` dispatched in last 10 min (read `foundation_notification_dispatches` last row)
  - Bounded retry: per-adapter max 3 attempts, exponential 500/1500/4500ms with `AbortSignal.timeout`, then DLQ
  - Always wrapped in `try/catch`, returns within 20s hard ceiling (Promise.race with timeout)
  - Logs every attempt to new `foundation_notification_dispatches` table (status: ok | error | dlq | skipped_flap | skipped_severity | skipped_disabled)
- `dispatch()` is still awaited inside `Promise.allSettled` in `foundation-health-alerts/index.ts` so a hung adapter cannot block evaluator (already wrapped in `.catch(()=>{})`; add 20s outer timeout for belt-and-suspenders).
- Secret validation at startup of dispatcher: log `notif_config_invalid` once if enabled but secrets missing; do not throw.

Secrets needed (added later via `add_secret` only after user confirms):
- `SLACK_WEBHOOK_URL` (optional)
- `FOUNDATION_ALERT_EMAIL_TO` (optional)
- `FOUNDATION_NOTIFICATIONS_ENABLED` (already documented; remains the master gate)

## 4. New tables (single migration)

```text
foundation_notification_dispatches
  id uuid pk default gen_random_uuid()
  alert_key text not null
  severity text not null
  adapter text not null            -- slack|email
  status text not null             -- ok|error|dlq|skipped_flap|skipped_severity|skipped_disabled
  attempt int not null default 1
  error text
  payload jsonb
  dispatched_at timestamptz not null default now()

  index (alert_key, dispatched_at desc)
  index (status, dispatched_at desc)
  RLS: admin read only; service-role write
```

No changes to `foundation_health_alerts` or `foundation_replay_outcomes` schema. Only new indexes added (Section 2).

## 5. Operational safeguards (in alerts function)

- **Heartbeat missing-duration metric**: include `age_min` in alert detail (already partially) plus persist worst-case `max_age_min` per cron in heartbeat metadata for ops summary
- **Alert flapping suppression**: skip auto-resolve if alert opened <2 min ago (`first_seen_at + 2min > now()`); just refresh instead → prevents thrash on borderline metrics
- **Replay sample-size visibility**: include `total` in dashboard drift card and `replay_mismatch_high` alert detail (already there) — also surface "below sample threshold (n<20)" pill on dashboard so empty days don't look like green health
- **Dead-letter persistence**: handled via `foundation_notification_dispatches.status='dlq'`
- **Bounded retry**: max 3 attempts per adapter per dispatch (no scheduler-level retry — next alert tick handles re-fire)
- **Cron overlap protection**: dispatcher inserts a row with deterministic `idempotency_key = sha256(alert_key + minute_bucket)` (advisory unique index `uq_notif_idem_minute`) so an alerter that fires twice in the same minute cannot double-notify

## 6. Regression coverage (vitest, additive)

New `src/lib/__tests__/`:
- `foundationNotifications.dispatch.test.ts` — disabled→skip, enabled+critical→dispatch, enabled+warning→skip, adapter throws→caught, adapter timeout→DLQ, flapping suppressed
- `foundationNotifications.retry.test.ts` — 3 attempts, exponential backoff math, terminal DLQ
- `foundationRetention.guards.test.ts` — query never selects rows where `resolved_at is null`
- `foundationReplayDrift.math.test.ts` — total=0 → 0, mismatched>total → throws, NaN guards
- `foundationAlertFlap.test.ts` — 2-min suppression of auto-resolve
- `foundationResolvedAlerts.pagination.test.ts` — page math, severity filter SQL fragment, search debounce
- `foundationDashboard.states.test.ts` — empty/error/loading branches via mocked supabase client

Edge function deno test:
- `supabase/functions/_shared/notificationAdapters_test.ts` — env flag matrix, adapter timeout via mocked fetch

## 7. Verification

1. `bunx tsc --noEmit`
2. Harness build
3. `bunx vitest run`
4. `supabase--test_edge_functions ['foundation-health-alerts','foundation-alert-retention']`
5. Malformed-patch sweep on every touched file (same regex set as Phase I final gate)
6. `supabase--read_query` on `pg_indexes` to confirm new indexes exist
7. Live invoke alerter twice within same minute → verify single notification row (idempotency)
8. Live invoke alerter with `FOUNDATION_NOTIFICATIONS_ENABLED` unset → verify all dispatches `status='skipped_disabled'`
9. Dashboard load test: insert 5,000 synthetic resolved alerts → verify pagination query <300ms via `EXPLAIN ANALYZE`

## 8. Deliverables on completion

- Exact migration SQL (table + indexes)
- Exact cron diff (none added; only docs)
- Concise diffs per touched file
- Test run output
- Index proof from pg_indexes
- Live invocation evidence
- Remaining operational risks
- Rollout checklist
- Recommended production enablement order

## 9. Rollout checklist (will be in `runbook.md` and final report)

1. Deploy migrations + functions + dashboard changes (no behavioral change; flag off)
2. Verify dashboard renders new panels with prod data
3. Add Slack webhook secret in staging
4. Set `FOUNDATION_NOTIFICATIONS_ENABLED=true` on staging
5. Force a synthetic critical alert; verify Slack receives + dispatch row written
6. Repeat in production with email + Slack
7. Monitor `foundation_notification_dispatches.status='dlq'` for 48h before considering enablement final

## Out of scope (explicitly)

- No threshold tuning, no schema changes to existing alert/replay tables, no new cron jobs, no marketing/digest emails, no UI redesign, no migrating Phase I behavior.
