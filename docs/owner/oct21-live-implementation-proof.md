# Oct 21 named live implementation — current acceptance

## Applied and mounted

- Applied `docs/owner/at5-coach-training-access.pending.sql` verbatim through migration `drizzle/migrations/0086_at5_coach_training_access.sql`. Before-state definitions: `docs/owner/snapshots/oct21-coach-training-before.txt`.
- Mounted the six-week summary/practice-ideas control inside the actual `CoachPlanCard`; reads cover exactly 42 dated snapshots in batches of six, using the gated RPC on every read. Health redaction remains server-owned; unreleased Game IQ remains suppressed in athlete work.
- Real democoach form sign-in at 390×844, actual `/coach/athlete/:athlete` Development tab, accepted coaching connection created/accepted using canonical RPCs, summary opened and saved plans read. Screenshot: `/tmp/browser/oct21-live/coach-summary.png` (visually inspected).
- The TEST college outfielder has two saved plan dates, Oct 20–21. The summary showed those exact dates/counts and honest “No issue-linked practice ideas saved yet” / “Need more data”; no practice ideas or positive outcomes invented.
- Before connection, `coach_athlete_plan` returned `denied`; after `end_connection` it returned `denied` again. Existing rejected link restored; temporary canonical request removed by end_connection. Coach and player passwords scrambled after each run. No training, equipment or measurement rows written.
- Actual pitching builder now preserves source-owned `full_go` stages from EASS, with sore-arm suppression using stage metadata rather than display names. Two-sport actual-builder tests preserve existing 30-pitch off-season doses across eligible dates; no lifting or throw-volume change. Phone execution acceptance remains open.

## TEST ADMIN real phone reads

The existing clearly named TEST ADMIN was reused; no duplicate admin or real owner change.

- Real form sign-in, 390×844, `/owner/coaching-console`: saved questions/options loaded, not merely a loading placeholder. Screenshot `/tmp/browser/oct21-admin/console.png` visually inspected.
- `/owner/exercise-vault`: owner review queue and issue-tag controls visible. Screenshot `/tmp/browser/oct21-admin/vault.png` visually inspected.
- `/iq`: actual library visible, labeled “Internal — not released”. Screenshot `/tmp/browser/oct21-admin/iq.png` visually inspected.
- `/progress` Performance tab reached, but a positive internal Report Card view was **not** proved. No measurements invented to fill it.
- Read-only checks; no principle/answer edits. TEST ADMIN password scrambled after each run.
- Exact TEST ADMIN exclusion is **not applied**. Investigation found no staged exclusion SQL. Source paths requiring changes include admin-search-users, OwnerDashboard profile/role/subscription reads, list_my_requests_v2, list_my_coaches, team_discipline_summary and owner_principle_population_stats. Ordinary demo exact-email discovery must survive; this particular TEST ADMIN must be hidden. This is implementation remaining, not missing authorization.

## Validation

Changed-path run: five files / 137 tests passed (coach card/summary, six-week arithmetic, EASS actual builder, skillSessionPlan). A first edit mistakenly put stage mapping in the warm-up mapper; it was corrected in the EASS mapper, tests rerun, and preview returned `build OK` at 14:44:05 UTC. No unexplained build error remains.

Fresh full coverage: 473 files / 3,812 tests passed across bounded runs. Initial full run reached 366 files / 3,478 passed tests before the 600-second command limit. Remaining 107 files covered 334 tests; one adjustment-hook loading wait timed out under contention, then its isolated two-test file passed unchanged (1 worker). This is bounded complete coverage, not a single uninterrupted green suite. Latest preview `build OK`: 14:56:30 UTC.

## Not accepted yet

- Requested TEST hitter with 14 games and TEST pitcher coach proofs, assigned-org and scout-specific hosted checks. The inspected system TEST pitcher profiles have no saved snapshots; the inspected game table did not identify a 14-game TEST hitter. No synthetic six-week history was created.
- plan-swap atomic server/AI/memory/log, every-card mounting and all four positive saved phone swaps; equipment questions retained until replacements genuinely work.
- Softball 60-foot catalog routes and baseball/softball actual-plan conditioning proofs. Existing 43-foot sprint is not a base route and is not relabeled.
- Pitcher/fielder/baserunner actual-plan phone execution proofs.
- App-entered mixed-signal/testing-day cases and positive followed recommendation/re-test.
- Tonight's 04:30 UTC result cannot be reported before that run occurs; existing Oct 21 run was empty, not positive evidence. No cron change or manual run.

No publish, cron or iOS changes. Ready to publish: **no**.