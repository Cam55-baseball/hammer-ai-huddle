# Item 3 — Update Hammer, October 29

## Latest run — October 29, 16:01 UTC

**Still open.** Fresh Item 18 setup reached the initial assessment, not a validated started week. This run did not exercise the four requested changes or connected democoach before/after views. Historical proof below remains historical, not new acceptance. No new Item 3 completion or live rollout is claimed.

## Root causes and changes
1. Manual season writes used UPDATE with no returned row: absent MPI settings silently changed nothing. They now upsert with the athlete's saved sport and require a returned record.
2. Tell Hammers SEASON entries were saved but the season resolver never consumed them. `seasonWithTimeline` now projects explicit effective, active entries into both `phase-state` and `wk-generate-daily`. Future changes remain future; newer manual answers win; undo removes the timeline projection without a second settings write.
3. The seven-day comment in Today only invalidated caches and generated today's date. `rebuildAfterChange` now requests all seven dates sequentially through the authenticated `wk-generate-daily` day-lock adjustment path. Marked rows remain protected. Null/error/non-ok replies cannot produce a success message.
4. Adjustment equality ignored season when movements/doses were unchanged. `planChangeSignature` includes phase, so a retained coordination drill no longer carries an old offseason label after switching to in-season.
5. Season date Save launched an unawaited mutation and confirmed prematurely. It now waits, validates end-after-start, and explicitly uses the saved date windows.
6. Explicit season phases and numeric available days in Tell Hammers words now parse to structured changes, rather than notes. The alternate dialogue also routes structured changes to the canonical timeline save. Uninterpretable words remain notes; no inference of dates/injury clearance.
7. Games/practice imports, cancel/reschedule/restore, pitcher schedule and pain changes use the same rebuild. Phase, envelope, schedule, saved block and authorized coach queries invalidate after results. Mounted coach plan card refreshes its existing access-checked read every 15 seconds; no broader data access was added.

## Phone proof actually observed
Existing owner-created TEST Goal Picker player, Chromium 390×844, real signed-in UI, no session bypass or fake saves:
- Before/after screenshots for offseason, in-season, preseason, postseason, season start, season end, four available days, games tomorrow, cancellation, break, and shoulder soreness.
- Each initial flow visibly confirmed seven-date builder success; canonical readback had 78 rows over seven dates and 49 adjustment records. Reload preserved saved changes.
- Latest deployed comparison fix removed stale `os_q1` labels; final readback returned 63 rows all `in_season` on six non-Sunday dates. Availability read back exactly 4.
- The training block drawer displays `Season: in season`; The General shows `In-Season — Strength Primer`. Screenshots inspected.
- After further injury/schedule inputs, one day was rejected on repeated rebuilds. UI correctly changed to **saved, but 1 day could not be rebuilt**, not false success. Six dates retained in-season readback. The refusal has not been fully diagnosed; no safety rules bypassed to force a pass.
- Tests: 13 files / 92 tests passed, including explicit phase/date precedence, exact available-day parser, seven-date invocation, rejected/null replies, season signature, existing coach gate tests and app/server phase parity.
- Automatic preview build OK at 02:28:45 UTC.

## Live/pending and incomplete requirements
Authorized deployments: `wk-generate-daily`, `phase-state`; latest hashes recorded in tool output. Client changes are in preview. No migration, publication, cron or iOS change.

Item 3 remains OPEN. Do not treat confirmations alone as complete plan proof:
- Every change has not been proven to restructure all combined sport/physical snapshots on all upcoming dates. Existing Item 2 combined-plan acceptance limits remain untouched.
- One rebuild refusal remains after the TEST injury changes; determine its cause and prove the appropriate safe result.
- Available days save/readback is proven, but the server does not yet consume `weekly_availability_days`; schedule availability restructuring is not certified.
- Manual quick-phase/date forms and all practice/import/pitcher schedule variants are wired but not individually phone-proven.
- The coach refresh has regression coverage but no connected-coach before/after UI proof. No connection, sharing consent or role was fabricated for this check.
- Only The General's post-change state was captured, not paired before/after images for every change type.
- Unknown/free-form schedule context still remains a note; no guessed plan changes.

Screenshots and temporary readback: `/tmp/browser/item3/`. Existing TEST data was retained; no real-account changes, performed work, or destructive cleanup.