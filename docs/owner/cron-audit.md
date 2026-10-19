# Scheduled jobs audit — Oct 19 2026, 05:05 UTC (read-only)

Nothing was changed. The owner decides; the owner applies any change.

**Timeout column:** "set" = the job states its own wait time. "5 s default" = the job calls a backend function without a stated wait, so the caller stops listening after 5 seconds. **The function keeps running after that** — a timeout means "nobody waited for the answer", not "the work stopped". "n/a" = runs inside the database, no web call.

## The two 5-second timeouts at 05:00 UTC
Four jobs fired at 05:00. Two make web calls without a stated wait:
1. **nightly-mpi-process** — timed out for the caller, but the work **finished**: logs show 196 baseball athletes in 4 batches + softball, "Complete." at 05:00:19 (about 12 s).
2. **engine-auto-recovery-10min** — timed out for the caller; the function started (05:00:04) but wrote no completion line, so completion is **unproven**. It only fires when health looks low.
(wk-daily-plan-build has a stated wait and returned; wk-mark-missed-lifts, hammer-state and hie-refresh made no web call at 05:00.)
The same 5 s timeouts also happen every hour on other "5 s default" jobs (18 between 03:30 and 05:00). Suggested fix for the owner: add a longer stated wait to the jobs marked ⚠ below.

## Jobs
| Job | When (UTC) | What it does | Used by | Still live? | Timeout | Recommend |
|---|---|---|---|---|---|---|
| intelligence-learning-loop-nightly | 04:30 daily | Re-checks followed advice to learn what worked | Hammers Intelligence | Yes | set | Keep |
| wk-daily-plan-build | every 10 min | Builds missing daily plans for started players | Hammers Today | Yes | set | Keep |
| wk-daily-plan-check | :30 hourly | Checks every started player has today's plan | Hammers Today | Yes | set | Keep |
| wk-mark-missed-lifts | every 15 min | Marks past lifts as missed | Hammers Today | Yes | n/a | Keep |
| renewal-reminders-daily | 14:00 | Emails renewal reminders | Billing | Yes | set | Keep |
| stripe-reconcile-nightly | 07:20 | Matches plans with Stripe | Billing | Yes | set | Keep |
| nightly-mpi-process | 05:00 | Nightly rankings/MPI | Rankings, MPI | Yes | ⚠ 5 s default (work completes) | Keep, add wait |
| nightly-hie-6am | 06:00 | Nightly player insights | Insights | Yes | ⚠ 5 s default | Keep, add wait |
| hie-refresh-15min | every 15 min | Refreshes changed players' insights | Insights | Yes | 5 s default | Keep |
| hammer-state-15min | every 15 min | Updates readiness state | Readiness | Yes | 5 s default | Keep |
| hammer-state-nightly-full | 03:40 | Full readiness rebuild | Readiness | Yes | ⚠ 5 s default | Keep, add wait |
| predict-hammer-state-2h | 04:17 | Readiness predictions | Readiness | Internal | ⚠ 5 s default | Keep |
| evaluate-predictions-4h | 04:37 | Scores yesterday's predictions | Engine | Internal | ⚠ 5 s default | Keep |
| evaluate-advice-effectiveness-4h | 04:31 | Scores advice outcomes | Engine | Internal | ⚠ 5 s default | Keep |
| engine-heartbeat-15min | :37 hourly | Engine heartbeat | Engine health | Internal | 5 s default | Keep |
| engine-sentinel-60min | :07 hourly | Engine anomaly scan | Engine health | Internal | 5 s default | Keep |
| engine-auto-recovery-10min | :00/:30 when unhealthy | Auto-repair when health low | Engine health | Internal | ⚠ 5 s default (completion unproven) | Keep, add wait |
| engine-adversarial-6h | 01:23 | Stress test of engine | Engine QA | Internal only | 5 s default | Owner choice (remove if unused) |
| engine-regression-runner-12h | 01:11 | Engine regression checks | Engine QA | Internal only | 5 s default | Keep |
| engine-weight-optimizer-6h | 04:43 | Tunes engine weights | Engine | Internal | ⚠ 5 s default | Keep |
| engine-data-integrity-check-daily | 06:15 | Data integrity scan | Engine health | Internal | 5 s default | Keep |
| compute-system-health-15min | :52 hourly | System health score | Owner health page | Internal | 5 s default | Keep |
| update-user-engine-profile-weekly | Sun 05:13 | Weekly engine profile | Engine | Internal | 5 s default | Keep |
| adaptive-phases-shadow-daily | 06:15 | Shadow test of adaptive phases | Shadow test only | Not player-facing | 5 s default | Owner choice |
| tcs-shadow-nightly / tcs-shadow-determinism / tcs-exposure-ledger-nightly / tcs-shadow-weekly | 02:00 / 04:30 / 02:20 / Mon 06:00 | Shadow test runs for TCS | TCS (shadow) | Not player-facing | 5 s default | Owner choice |
| tcs-auto-off-nightly | 04:45 | Safety switch-off for TCS | TCS | Yes (safety) | 5 s default | Keep |
| ti-auto-activate-nightly | 03:10 | Activates approved training items | Training intelligence | Yes | 5 s default | Keep |
| ti-watchdog-scan / ti-watchdog-digest | 05:20 / 12:00 | Watches training items, daily digest | Training intelligence | Yes | 5 s default | Keep |
| phase9-evaluate-behavioral-state | :05 hourly | Behavior state | Engine | Internal | 5 s default | Owner choice |
| phase9-detect-behavior-patterns | 04:25 | Behavior patterns | Engine | Internal | 5 s default | Owner choice |
| phase8-cleanup-synthetic-activity-logs | 02:10 | Removes synthetic logs | Cleanup | Yes | n/a | Keep |
| foundation-health-alerts-hourly | :05 every 4 h | Foundation alerts | Foundations | Yes | 5 s default | Keep |
| foundation-alert-retention-daily | 04:30 | Old alert cleanup | Foundations | Yes | 5 s default | Keep |
| hourly-foundation-trigger-decay | :15 hourly | Fades old triggers | Foundations | Yes | 5 s default | Keep |
| nightly-foundation-effectiveness | 02:00 | Foundation video effectiveness | Foundations | Yes | 5 s default | Keep |
| nightly-foundation-health | 03:00 | Foundation health | Foundations | Yes | 5 s default | Keep |
| daily-foundation-trace-prune | 04:00 | Old trace cleanup | Foundations | Yes | 5 s default | Keep |
| iq-decay-daily | 04:00 | Game IQ review timing | Game IQ | Yes | 5 s default | Keep |
| retry-follower-reports-every-5-min | :07 hourly | Retries follower reports | Follower reports | Yes | 5 s default | Keep |
| generate-follower-weekly-digests / -monthly-reports | Mon 12:00 / 1st 13:00 | Follower report emails | Follower reports | Yes | 5 s default | Keep |
| training-block-daily-check | 07:00 | Training block notifications | Retired programs | Probably not | 5 s default | Owner choice (likely remove) |
| discover-tag-patterns-weekly | Sun 03:00 | Video tag patterns | Video library | Yes | 5 s default | Keep |
| daily-link-integrity-check | 03:00 | Checks video links | Video library | Yes | 5 s default | Keep |
| archive-old-scout-applications | 03:00 | Archives old scout applications | Scouts | Yes | n/a | Keep |
| cleanup-* (advisory logs, explanations, function logs, interventions, webhooks, patterns, prediction outcomes, predictions, regression results, snapshot versions, system health, weight adjustments, weight history), engine-heartbeat-cleanup-daily, engine-sentinel-cleanup-daily, engine-adversarial-cleanup-daily | daily | Delete old log rows | Housekeeping | Yes | n/a | Keep |
