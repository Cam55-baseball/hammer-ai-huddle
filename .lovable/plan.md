# Cloud Cost Audit — What's Actually Draining Credits

## The headline: it is not AI

Your migration to Google/OpenAI worked. AI Gateway usage over the last 7 days is **zero requests**. Nothing in the app calls Lovable AI anymore.

Credits used this billing period (Jul 19 – Aug 19), 952 total:

| Item | Credits |
|---|---|
| Build mode messages | 704.36 |
| Plan mode messages | 190.70 |
| **Cloud compute (database)** | **40.34** |
| Cloud functions / egress / storage / realtime | 5.37 |
| AI Gateway (all models, all pre-migration) | 11.46 |

Chat messages are the bulk. The part that drains **without anyone building** is Cloud: ~0.93 credits/day compute plus ~0.11/day functions, egress and storage. Your plan's free Cloud allowance is 40/month and compute alone has now used 40.34 — so Cloud has crossed into paid credits. This cannot be moved to Google or OpenAI; it is your database and file storage, not AI.

## What is keeping Cloud awake

The backend runs 53 active scheduled jobs. Compute bills while the database is awake, and these jobs never let it sleep. In the last 24 hours:

```text
check-render-status-every-minute        1440 runs/day
check-render-status-every-2min           720 runs/day   <-- duplicate of the above
retry-follower-reports-every-5-min       288 runs/day
engine-auto-recovery-10min               144 runs/day
engine-heartbeat-15min                    96 runs/day
hammer-state-15min                        96 runs/day
hie-refresh-15min                         96 runs/day
6 hourly jobs                            144 runs/day
-------------------------------------------------------
                                      ~3,000 function invocations/day
```

Two findings stand out:

1. **`check-render-status` is scheduled twice** — one job every minute and a second job every 2 minutes, both calling the same function. That is 2,160 invocations a day, and the logs show every single one returning "Found 0 processing jobs". It is doing nothing except paying to stay awake.
2. **The 5/10/15-minute engine jobs** (auto-recovery, heartbeat, hammer-state, HIE refresh) run around the clock regardless of whether any athlete is active. Together they guarantee the database never idles.

Storage is the other slow drip: 8.6 GB total, of which the `videos` bucket is 7.5 GB across 1,080 objects, plus a 626 MB `landing-demo` bucket holding only 5 files. Storage and egress bill continuously.

Database health is otherwise fine: memory 58%, disk 29%, connections 14/60. No resize needed.

## Proposed changes

### 1. Kill the duplicate render-status job
Remove `check-render-status-every-2min` entirely. It is a redundant copy. Immediate: -720 invocations/day.

### 2. Slow the render-status poller
It only matters when a video render is in flight. Change the remaining job from every minute to every 5 minutes, and have the function early-exit before touching the database when there is no pending work. Renders still get picked up; the polling stops being the app's heartbeat. Saves a further ~1,150 invocations/day.

### 3. Right-size the engine schedules
- `retry-follower-reports` every 5 min → every 30 min (it is a retry path, not a live surface).
- `engine-auto-recovery` every 10 min → every 30 min.
- `hammer-state`, `hie-refresh`, `engine-heartbeat` from 15 min → 30 min.

These change refresh latency for background analytics only; nothing user-facing waits on them.

### 4. Trim the landing-demo bucket
626 MB for 5 files means old demo uploads are still stored. Delete superseded versions and keep only the live demo video and its poster.

### 5. Review video retention
7.5 GB of athlete video is the single largest storage item and it only grows. Decide a retention rule (for example, keep analysed clips, expire raw uploads older than N months) before this doubles.

### 6. Add a credit alert
Set a workspace usage alert so you are notified before Cloud usage crosses the free allowance again, instead of finding out from the balance.

## Expected result

Cutting roughly 2,000 of ~3,000 daily invocations and lengthening the wake cadence should let the database idle far more of the day. Compute is the ~0.93/day line item; a meaningful share of that becomes recoverable. Function and egress lines drop proportionally with the invocation count.

## Technical notes

- Cron schedules are managed through the Cloud Jobs UI (More > Cloud > Jobs), not raw SQL — I will direct the changes there rather than mutating `cron.job` directly.
- The early-exit guard in `check-render-status` is a code change in `supabase/functions/check-render-status/index.ts`: return before any query when no render jobs are pending.
- Storage cleanup targets the `landing-demo` bucket via the storage API; the live `landing_demo_video` row and its `poster_url` stay intact.
- No schema changes, no RLS changes, no changes to any AI provider wiring.
