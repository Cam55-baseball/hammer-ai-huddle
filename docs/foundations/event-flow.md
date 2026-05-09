# Event Flow — Tables, Functions, Cron

## Tables

| Table | Purpose | Wave |
|-------|---------|------|
| `library_videos` (foundation_meta, foundation_effectiveness, foundation_health_*) | Content + learned stats + health | A/C/D |
| `foundation_recommendation_traces` | Every surfaced/suppressed video, replayable | A |
| `athlete_foundation_state` | Per-user developmental state | B |
| `foundation_trigger_events` | Per-trigger fire log + decay | B |
| `foundation_video_outcomes` | Click/completion/help/resolve evidence | C |
| `engine_settings` (foundations_*) | Kill switches + rollout % | E |

## Edge Functions

| Function | Wave | Trigger |
|----------|------|---------|
| `recompute-foundation-effectiveness` | C | nightly cron 02:00 UTC |
| `nightly-foundation-health` | D | nightly cron 03:00 UTC |
| `hourly-trigger-decay` | E | hourly cron :15 |
| `daily-trace-prune` | E | daily cron 04:00 UTC |

## Realtime / Manual

- Trace inserts are batched fire-and-forget from `useFoundationVideos`.
- State + trigger writes go through `BroadcastChannel('data-sync')` for multi-tab consistency.
- Admin replay route `/owner/foundations/traces` re-runs scorer against frozen snapshot for verification.

All edge functions use `persistSession: false`, dual-auth, exclude system user `00000000-0000-0000-0000-000000000001`, and resume via continuation tokens.
