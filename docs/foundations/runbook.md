# Foundations — Operational Runbook

Last updated: Phase II.

## Required environment variables

| Var | Scope | Purpose |
|---|---|---|
| `SUPABASE_URL` | edge | service-role client URL |
| `SUPABASE_SERVICE_ROLE_KEY` | edge | service-role client key |
| `FOUNDATION_NOTIFICATIONS_ENABLED` | edge | master gate for Slack/email dispatch (`true` to enable). Default off. |
| `SLACK_WEBHOOK_URL` | edge | Slack incoming webhook for critical alerts (optional) |
| `FOUNDATION_ALERT_EMAIL_TO` | edge | recipient for `foundation-alert` transactional email (optional) |

The frontend uses the standard `VITE_SUPABASE_*` vars only.

## Cron inventory

See [`cron-inventory.md`](./cron-inventory.md).

## Alert lifecycle

1. `foundation-health-alerts` runs hourly, evaluates rules from
   `_shared/foundationThresholds.ts` and produces an `Eval` per key.
2. **Open**: no row in `foundation_health_alerts` with `resolved_at IS NULL`
   for that `alert_key` ⇒ insert a new row. `uq_fha_open_key` guarantees one
   open row per key.
3. **Refresh**: row already open ⇒ update `severity`, `title`, `detail`,
   `last_seen_at`. No new row created.
4. **Auto-resolve**: condition cleared and the open row was first seen
   **≥2 minutes ago** ⇒ set `resolved_at = now()`. Younger rows are
   *refreshed* instead (anti-flap window).
5. **Notify**: only **newly opened critical** alerts trigger
   `notificationAdapters.dispatch()`. Warning/info open events are
   recorded as `skipped_severity` in `foundation_notification_dispatches`.
6. **Retention**: `foundation-alert-retention` runs daily and deletes
   resolved rows older than `ALERT_RETENTION_DAYS` (30). Unresolved rows
   are protected by the hard guard `.not('resolved_at','is',null)`.

## Replay drift interpretation

`foundation_replay_outcomes` records every replay (manual + cron).

- **Drift rate** = `mismatched / total` over the configured window.
- **Sample threshold**: rate is suppressed below
  `ALERT.REPLAY_MISMATCH_MIN_SAMPLE` (currently 20 samples / 24h). The
  dashboard shows a *"below sample threshold"* pill so empty days are not
  read as healthy.
- **Severity bands**:
  - `≥ ALERT.REPLAY_MISMATCH_WARN` → warning
  - `≥ ALERT.REPLAY_MISMATCH_CRIT` → critical
- A persistent warning means recommendation logic has shifted but is
  still ~consistent. A critical drift means a regression — inspect the
  most-recent mismatch samples panel and run `foundations-replay` on the
  affected videos.

## Notification system

- **Master gate**: `FOUNDATION_NOTIFICATIONS_ENABLED`. When unset, every
  call writes a `skipped_disabled` row (proves the path executed) and
  returns immediately.
- **Severity gate**: critical-only. Warnings and info are logged as
  `skipped_severity`.
- **Flapping**: skips delivery if the same `(alert_key, adapter)` pair
  succeeded in the last 10 minutes.
- **Idempotency**: `(alert_key, adapter, minute_bucket)` unique index
  blocks double-fires within the same minute (e.g. cron overlap).
- **Retries**: per-adapter, max 3 attempts, exponential 500/1500/4500ms.
  After exhausting retries the dispatch is recorded as `dlq`. There is
  no scheduler-level retry — the next alerter tick will re-evaluate.
- **Outer timeout**: 20s inside dispatch + 25s `Promise.race` in the
  alerter. A hung adapter cannot block evaluator completion.

See [`notification-enablement.md`](./notification-enablement.md) for the
production rollout sequence.

## Retention

| Table | Retention | Job | Guard |
|---|---|---|---|
| `foundation_health_alerts` (resolved only) | 30d | `foundation-alert-retention` (`30 4 * * *`) | `.not('resolved_at','is',null).lt('resolved_at', cutoff)` |

Unresolved alerts are never touched. The retention edge function asserts
this guard at the top of every run.

## Rollback procedures

| Change | Rollback |
|---|---|
| Notification flag enabled in error | `update_secret FOUNDATION_NOTIFICATIONS_ENABLED=false`. Existing dispatch rows are preserved for audit. |
| Alerter producing false-positive criticals | Edit `_shared/foundationThresholds.ts` ALERT thresholds → redeploy. Open rows refresh in next tick; old rows auto-resolve once condition clears. |
| Retention deleted unintended rows | None — retention is `DELETE` only. Restore from PITR if needed. |
| Phase II tables / indexes | `DROP TABLE public.foundation_notification_dispatches CASCADE;` and `DROP INDEX idx_fha_resolved_severity, idx_fha_alert_key_resolved;` |

## Operational troubleshooting

| Symptom | First check |
|---|---|
| Dashboard heartbeats red | `select * from foundation_cron_heartbeats order by ran_at desc limit 50;` — confirm last run + `status`. |
| Suppression-rate alert won't clear | Check `foundation_recommendation_traces` for the last 24h with `suppressed=true`. The alert auto-clears once the rate drops under `ALERT.SUPPRESSION_RATE_WARN`. |
| Replay drift critical | Open *Recent replay mismatches* card → run `POST /foundations-replay` for affected `trace_id`s. |
| Slack not delivering | `select status, error from foundation_notification_dispatches order by dispatched_at desc limit 20;` — look for `dlq` or `config_invalid`. |
| Email not delivering | Check the email queue runbook + `email_send_log` for the `foundation-alert-*` idempotency key. |
| Alerter writing nothing | Check edge logs for `foundation-health-alerts` — most common cause is a thrown error before `cron_heartbeats` insert. |

## Related docs

- [`cron-inventory.md`](./cron-inventory.md) — every cron job
- [`notification-enablement.md`](./notification-enablement.md) — go-live order
- [`observability-map.md`](./observability-map.md) — tables and surfaces
