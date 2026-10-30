# Database capacity — October 30, 2026 emergency

## Recovery and evidence

- Owner authorized restarting the shared Live Lovable Cloud backend. Restart tool accepted the request around **22:00 UTC**. Acceptance is not confirmation of completion.
- At 22:00:18 UTC the auth-to-database probe timed out. Current health metrics were unavailable.
- The only returned IO exhaustion alert was **04:01:53 UTC**, value **46**, described as “IO budget is less than 50%.” This is a historical alert, not a reading from the 21:58 outage. No recovery events are supplied.
- Bounded database/auth log searches for 21:15–22:03 returned no records. Missing logs do not prove an absence of failure or load.
- A detached full-suite runner was still alive at 22:00, on batch 25 with one Vitest worker. Its runner and four descendants were killed at 22:00:29. No remaining browser/test processes were found. No sub-agents were launched in this recovery.
- Concurrent verification and plan rebuilding are plausible additional demand, **not a proven cause**. Inspected batch-25 tests imported pure shared logic; that alone does not establish live IO. The suite also contained hosted integration tests, including a scheduling test with a hardcoded hosted destination; these are now excluded. Historic simultaneous activity and its actual database cost could not be measured from the returned signals.

## Current instance and IO budget

The October 30 usage record contains **22 instance-hours on the Pico billing meter**, recorded through 21:23:38 UTC. This identifies the recorded size before the outage, not a fresh control-plane size read. Current size should be confirmed at **More → Database → Manage → Settings → Database size**; display names can change.

Current Pico quote: **0.0774192 requested credits/hour**, or **55.741824 requested credits for 720 continuously running hours**. Other backend resources are separate.

The diagnostic reports a percentage-based IO budget alert but does not expose baseline IOPS, throughput, refill rate, maximum burst balance or current remaining balance. Official Lovable documentation does not specify those figures per instance. **Exact IO budget and sustained hardware specifications remain unverified; do not replace them with generic vendor numbers.** Database disk capacity and compute are separate controls.

## Steady background load

Observed accounting: **6,233 function invocations** recorded October 30 through 21:23:38. This includes user and verification activity and is **not a measurement of steady background load** or IO consumed.

Inspected background candidates:
- `wk-daily-plan-job`: searches missing started-player days, prebuilds tomorrow after local noon, dispatches generation workers and records runs. Existing IO-safe policy documents at most four concurrent builds. No schedule was changed.
- `engine-regression-runner`: reads recent 30-day snapshot history and logs its run; individual computations alone do not describe disk load.
- `update-user-engine-profile`: loops eligible users and reads 30-day state history.
- Historical `io-relief.sql` recorded approximately 381 MB job history, 1.5 GB engine versions and 460 MB state snapshots on October 29. These are **old measurements**, not current sizes.

Actual background executions, database read/write rates, steady IO budget consumption and peak overlap remain unavailable until health and bounded execution diagnostics answer. Source identifies candidates, not deployed frequency. Required next measurement: representative quiet and peak windows of CPU, memory, connections, read/write throughput and IO budget, alongside safe schedule metadata and query statistics.

## Upgrade recommendation and cost

**Conditional candidate: Medium database instance**, via **More → Database → Manage → Settings → Manage instance** (also exposed under Backend advanced instance settings). Current quote is **0.330368 requested credits/hour**, **7.928832/day**, or **237.86496 per 30 days at 720 active hours**. Relative to the recorded Pico quote, the same 720 hours would add **182.123136 requested credits**. These are instance-only quotes before coverage, not dollars paid, not a whole-app bill and not a guarantee against recurrence.

Small is quoted at 120.744 credits/720 hours; Large at 445.9104. Medium is a capacity-review candidate, **not a demonstrated IO fix**: obtain its sustained IO entitlement and compare it with measured peak load before selecting it. No tool/doc evidence establishes that a particular option has non-burst IO. Increasing storage cannot be recommended for an IO outage without disk-full evidence. No resize was performed or authorized.

## Quick wins — proposed only, not applied

1. **Old job-run history:** inspect jobs at **More → Database → Manage → Jobs**. Request the supported, bounded one-time history cleanup if available. The old `docs/owner/io-relief.sql` contains direct reserved-schema job-history deletes and a **new cron job**; do **not** run that file wholesale. Managed job tables are guarded, so it is not a verified executable cleanup path here. Do not change any schedule. Capture exact cleanup scope first; perform bounded batches during a quiet window and recheck load. Deletes/vacuum create IO themselves and do not necessarily lower allocated storage or billed active hours.
2. **Snapshot retention:** old review proposed 45 days, preserving each athlete's latest state and all feedback-linked snapshots; inspected readers include 30-day history and latest-two views. This is not a current complete reader/foreign-key/audit certification. State snapshot deletes can cascade into predictions, explanations and feedback. Reverify all readers, lineage/audit requirements and cascades, take the approved snapshot/export, then seek exact owner approval before deleting anything. No purge or retention change occurred.
3. **Verification isolation, now applied:** default Vitest excludes hosted `.live.test` files and `scheduling-elite.test.ts`; shared setup rejects external fetches before they reach the network. Tests use mocks or local services. Two offline guard checks passed. Do not run suites against Live, allow parallel browsers, or launch sub-agent investigations. One light browser proof at a time only after a load check. Do not detach verification runners.

## Published sign-in

Pending successful restart and load check. A published login page loading is not successful sign-in; session restoration is not password sign-in. Recovery must be verified against the published origin with an actual token/password exchange and authenticated UI readback, without starting plans or changing athlete data.

No publish, deployment, migration, cron changes, iOS changes, retention change or compute upgrade was performed.

Capacity/pricing evidence: project cost lookup at 22:01:55 UTC; database health checks during recovery; official https://docs.lovable.dev/features/database-performance . Cost-optimization evidence boundaries were used for the conditional estimate.