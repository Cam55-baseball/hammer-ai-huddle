# AV1 — October 21 authorized implementation and phone checks

Ready to publish: **no**. No publish, cron or iOS changes.

## Applied
- Migration 0087 adds declared catalog base routes. Hosted readback confirms softball single/double/triple/home run at 60/120/180/240 feet and 1/2/3/4 bases; baseball doubles declare two 90-foot bases. The 43-foot pitcher-distance repeat has no base route.
- Generator reads explicit sport-matching routes, supplies declared distance only to new rep-based conditioning, and emits the shared 30-second/four-base 300-second counter metadata. Softball selects its own double instead of baseball's. Existing saved plans are not rebuilt.
- Migration 0088 updates six hosted list/statistics RPCs with the exact TEST ADMIN exclusion. Definitions read back with the exclusion present: list_my_coaches, list_my_requests_v2, list_org_roster, owner_principle_population_stats, search_athletes_to_connect, team_discipline_summary. Before-change snapshot: `docs/owner/snapshots/av1-admin-functions-before.txt`.
- Owner dashboard list/aggregate/search reads and admin-search-users exclude the same exact account; ordinary system demo athletes remain eligible for deliberate connections. Exhaustive every-list audit is still open.
- General's Report Card now mounts through its staff access gate outside unrelated training-history/subscription milestones; internal label is visible. Other advanced panels retain their existing gates. No grades or measurements were invented.
- Authorized deployments: admin-search-users and wk-generate-daily. Final generator checker passes with isolated dependency resolution; no unexplained server errors.

## Real phone UI
390×844 Chromium emulation, not a physical iPhone. TEST sign-in used the real form; passwords privately randomized and scrambled in finally blocks.
- TEST ADMIN: Coaching Console and Questions for the owner visible; Vault review queue visible; Game IQ labeled Internal — not released; General Performance shows the mounted Hammers Report Card with internal label and missing measurement placeholders. Screenshots under `/tmp/browser/oct21-admin/` and `/tmp/browser/av1/admin-report-visible.png`; readout `/tmp/browser/av1/dashboard-proof.log`.
- Owner-only admin-search-users refuses the TEST admin. This is **not** a successful search-exclusion proof; no owner privilege granted or real-owner reset performed.
- Actual Hammers Today route `/dashboard` opened as baseball college TEST athlete: existing recovery day, warm-up/lift mobility/recovery visible; fielding asks for equipment confirmation. No conditioning session on that day, therefore no conditioning acceptance claimed. Saved-plan server verification returns HTTP 200, verified true.
- Actual softball TEST dashboard: assessment 0 of 6, Start locked. No gate bypass, no synthetic plan, no conditioning acceptance claimed. Complete/skip assessment through authorized real UI before the next proof.
- `/my-daily-game-plan` is the separate task schedule, not Hammers Today's exercise plan; initial screenshots there are not exercise acceptance evidence.

## Validation
- Full suite: 475 files / 3,822 tests PASS, `/tmp/av1-full-suite.log`.
- After final baseball declared-distance fallback: two files / 36 tests PASS, `/tmp/av1-route-final.log`; one additional concrete baseball route test. Full suite not rerun after that final change.
- Staff access and changed-path tests: six files / 48 tests PASS; initial timer/exclusion checks four files / 40 tests PASS.
- Local server checker temporarily resolved a newer client dependency into project node_modules, exposing unrelated stricter type errors. Restored the frozen app dependency lock; preview returned build OK. Later server check uses node-modules-dir=none to avoid altering app dependencies.

## Still open
Universal plan-swap/AI/atomic equipment memory/log, every-card/coach-work wiring, four positive saved/readback Swap phone cases and replaced inventory questions; requested coach hitter/pitcher/org/scout acceptance; actual-plan conditioning/full-go roles; app-entered mixed-signal/testing-day and comparable followed-recommendation/re-test pair.

Nightly evidence remains the recorded Oct 21 04:30 HTTP 200 empty run (0/0/0), not positive learning. No manual trigger or cron change. Next scheduled outcome must be checked after it runs, not predicted.