# Oct 17 phone proof — Oct 18

Viewport: 390 × 844. Owner checks used signed-in owner; player checks used the existing demo two-way player. No new accounts created in this verification pass.

- [x] Owner Settings opens through the actual menu, switches readable, no horizontal overflow.
- [x] Drill CMS activity coverage visible.
- [x] Drill Builder activity coverage visible.
- [x] Subscribers current-plan view opens.
- [x] Coach agreement page and recent-notes empty state open (not vote proof).
- [x] Analysis-cost view opens.
- [x] History calendar opens at phone size.
- [x] Player Today, Vault and History open; child waiver rules unchanged.
- [x] One actual source clip produced a saved readable report after browser-compatible transcoding and pose timeout.
- [x] Exact test clip backed up then deleted; zero matching videos on read-back.
- [ ] Two suitable clips for each sport/type (12 reports) — only glove-throw/broadcast/document recordings available.
- [ ] New-player completion → Start → persisted Today; server guard pending owner migration authorization.
- [ ] Coach agreement votes and notes reflected back.
- [ ] Parent sharing and scouting permission save/read-back.
- [x] Completed health profile reopen/edit/save; setup did not auto-open after reload, edited profile saved, original test state restored. Screenshot: yy1-physio-redo.png.
- [ ] Populated practice details, frozen reports, Train next into Today.

Tests: 365 files, 2,937 tests PASS. No publish, cron, iOS, migration or Stripe changes.

## YY1 continuation
- [x] Baseball hitting, pitching, throwing low-resolution clips show Not measured plus Retry Analysis (no test upload created).
- [x] Deployed analyze-video: real throwing upload saved coaching despite pose timeout; AI cost estimate $0.013968 (18,478 input / 3,370 output tokens).
- [x] Same test clip with three unreadable frames returns HTTP success, Not measured report, saved=true, and a rejected run audit; no AI call or AI charge recorded for preflight rejection.
- [x] Scoped test clip backup/cleanup; read-back found zero videos. Existing demo account retained.
- [x] 17 targeted tests passed, preview build OK; prior full-suite result unchanged, not rerun for YY1.
- [ ] Softball screens: existing test players require current legal agreements. No waiver/consent bypass used.
- [ ] Required two appropriate clips per sport/type still missing. Do not report 100% general success.

Only analyze-video redeployed. No publish, cron, iOS, migration or Stripe changes.

## YY2 continuation
- [x] Linked parent Account settings → child scouting controls (390 × 844).
- [x] Metrics sharing saved and read back after reload, visibility stayed OFF; original scopes and choices restored.
- [ ] Optional connected-service sharing remains untested, separate from scouting scopes.
- [ ] Coach votes: test coach has no active Coach plan; gated screen captured, no bypass.
- [x] Agreement rounding tests (63→65; 18.44→18.4).
- [ ] Populated History: demo player has no practices/reports; no invented records added.
- [x] Full suite: 367 files, 2,941 tests passed; preview build OK.

No YY2 redeploy, publish, cron, iOS, migration, Stripe or new-account changes.