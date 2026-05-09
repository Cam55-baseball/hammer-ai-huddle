# Cron Map

| Job | Schedule (UTC) | Function | Side effects | Idempotent? | Resumable? |
|-----|-----------------|----------|--------------|-------------|------------|
| `nightly-foundation-effectiveness` | `0 2 * * *` | `recompute-foundation-effectiveness` | Writes `library_videos.foundation_effectiveness.byTrigger` | Yes | Continuation token |
| `nightly-foundation-health` | `0 3 * * *` | `nightly-foundation-health` | Writes `foundation_health_score`, `foundation_health_flags`, `foundation_health_checked_at` | Yes | 25/page cursor |
| `hourly-foundation-trigger-decay` | `15 * * * *` | `hourly-trigger-decay` | Decays `foundation_trigger_events.confidence` by `0.1/24`; auto-resolves at ≤ 0.05 | Yes | Single-pass sweep |
| `daily-foundation-trace-prune` | `0 4 * * *` | `daily-trace-prune` | Calls `cleanup_old_foundation_traces()` (90d retention) | Yes | RPC handles batching |

## Operational rules

- Each function uses `persistSession: false` and `Deno.serve()`.
- System user `00000000-0000-0000-0000-000000000001` is excluded from every pipeline.
- Failures log + return 200 with `{ status: 'partial' }` so cron does not retry-storm.
- All jobs respect `engine_settings.foundations_*` flags — when `foundations_enabled` is false they no-op.
- Manual re-run available from `/owner/foundations/diagnostics`.
