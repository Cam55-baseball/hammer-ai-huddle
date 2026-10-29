# Item 2 — thin Hammers Today, October 29

## Verified root cause
Owner's October 29 saved day contained one row: Slow Breathing Reset, incorrectly stored under `lift`. Start had already passed on October 27. The saved validator reported `ok: true`; missing lift roles and weekly shortfalls were only warnings.

The tissue-cost scheduler correctly withheld lifting between Tuesday's planned lift and Thursday. The endpoint incorrectly promoted `removeLift` into `training_context.day_type = recovery_day`. Both the final-save rule and the client then treated that lift-spacing answer as whole-plan rest and stripped sport skills. This was not a game-day primer: saved schedule showed no game, no within-48-hours cap, no primer-only decision.

Owner facts read, not fabricated: baseball, SS, advanced lifting history, six available days, in-season legacy phase, no MPI season-date row, no saved equipment row, active shoulder/ankle restrictions, active hitting/pitching/throwing modules. Existing safety restrictions were retained.

## Changes and proof
- Shared `planDayScope` separates Sunday/explicit HOLD from lift spacing. Loading caps and removeLift remain unchanged.
- Client composition no longer treats a saved `allowed_class: none` as whole-plan rest. Canonical saved phase overrides the legacy projection for composition.
- Shared structural validator rejects breathing-only training, orphan primers, mismatched phases/categories, and insufficient weekly counts. Client snapshot save refuses an unsuccessful structural result. Server checks final rows after safety trimming.
- Today cell/detail and Today sentence display the actual ready categories, not an unadjusted Thursday lift/defense promise. Saved in-season label remains visible when dates are missing.
- `wk-generate-daily` deployed with named owner authorization. Shared client-builder bundle regenerated from 71 source modules; no other function was redeployed.
- Owner authenticated app requests rebuilt October 29 through November 4 successfully, preserving marked work through the existing adjustment transaction.
- Real owner preview at 390×844 now shows two 10-minute hitting sessions (left/right, four drills each), conditioning, tissue-care rows and recovery—not one breathing row. Today strip matches these displayed categories.
- Targeted seven files / 170 tests passed. Eight-week actual-builder matrix covers both sports, five program/module shapes and four phases, with zero recovery-only training days and actual ready-work hitting/defense/baserunning floors in equipped, unrestricted simulations. Existing actual-builder bunting simulations passed. Latest preview build OK: 01:58:13 UTC.

## Seven-day saved row readback (not a full-week certification)
| Date | Saved physical work in plain words |
|---|---|
| Thu Oct 29 | Tissue care, cross-sport coordination, easy flush; today's client adds both-sided dry-swing hitting and recovery |
| Fri Oct 30 | Eight lift/tissue rows, bat-speed work, base-route sprints plus easy flush, coordination |
| Sat Oct 31 | Tissue care, easy flush, coordination; no loaded lift |
| Sun Nov 1 | Breathing recovery only; Sunday rest preserved |
| Mon Nov 2 | Nine lift/tissue rows, speed, bat speed, base-route sprints plus easy flush, coordination |
| Tue Nov 3 | Tissue care, easy flush, coordination; no loaded lift |
| Wed Nov 4 | Tissue care, easy flush, coordination; no loaded lift |

## Item 2 remains OPEN
Do not claim the requested complete seven-day/8-week certification:
1. Future server rows do not contain the app's complete skill block snapshots; a seven-day *combined* skill-and-physical plan has not been read back through every date's UI.
2. Weekly rejection helper is tested but is not yet integrated as an atomic, combined client/server week acceptance boundary. No claim that the real server week enforces every purchased minimum.
3. Conditioning's current `isRunningConditioning` treats Easy Flush (Bike or Walk) as running. That cannot prove the owner's requested two **running** sessions; actual-plan conditioning floors still need correction/proof without overriding ankle/shoulder restrictions or assuming available space.
4. Future roadmap cells remain template forecasts; only today's cell/detail/line now reconcile actual work. Full seven-day card/plan equality is not certified.
5. Owner has no saved equipment and active restrictions. Missing facts were not filled, injuries were not erased, and no unsafe extra work was added just to force a pass.

No publication, migration, cron or iOS change. No new TEST account or fabricated performed-work record.