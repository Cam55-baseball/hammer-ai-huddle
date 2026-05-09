# Foundations — Cron Inventory

| Job | Schedule (UTC) | Edge function | Max stale (min) | On failure |
|---|---|---|---|---|
| `foundation-health-alerts-hourly` | `5 * * * *` | `foundation-health-alerts` | 90 | self-alerts via `cron_missing:foundation-health-alerts` |
| `foundation-alert-retention-daily` | `30 4 * * *` | `foundation-alert-retention` | 1560 (26h) | self-alert + manual run |
| `daily-trace-prune` | `0 3 * * *` | `daily-trace-prune` | 1560 | self-alert |
| `nightly-foundation-health` | `0 2 * * *` | `nightly-foundation-health` | 1560 | self-alert |
| `recompute-foundation-effectiveness` | `0 5 * * *` | `recompute-foundation-effectiveness` | 1560 | self-alert |

Heartbeats land in `foundation_cron_heartbeats`. Severity transitions are
governed by `ALERT.HEARTBEAT_MISSING_CRIT_RATIO`.
