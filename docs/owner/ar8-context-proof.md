# AR8 — final batch proof and open acceptance

**Ready to publish: NO.** Preview changes only; no publish, deployment, migration, switch, cron or iOS changes.

## Substantial completed sub-steps

### Goal confirmation verifies the returned canonical order

AR7 awaited invalidation but did not inspect the refreshed order/date. AR8 now explicitly refetches the self-keyed goal read with errors enabled, compares the canonical five ranks and exact saved confirmation timestamp, and only then announces success and invalidates the planning context. Stale or failed readback preserves the selected draft, exposes a retry and does not announce success. This verifies the requested ranking, not all sub-goal editor behavior or concurrent whole-record writes. Cards still never generate plans.

The read recognizes legacy canonical ranks without a top-level categoryOrder; V1 ranks take precedence over a stray top-level value. Account/day-keyed draft state prevents another signed-in player inheriting selections or a Later dismissal. Eight component tests exercise actual card operations with in-memory self-scoped reads/writes, including returned/thrown failures, stale/failed readback and account changes. No hosted save was performed on the injected real player.

### Testing-day details stop retaining stale records

The dialog previously held a copied schedule row: a successful refresh with another account or changed schedule could leave an old player's date/tests in the dialog. Details now resolve the selected identity from the current successful self/date query. Cancelled/skipped or absent rows close the dialog; failed or unavailable source reads hide stale details and show the existing source error. No result-entry permission, schema, new fields or consent logic was added. Five component tests exercise actual open-details/contact navigation, exact athlete/date scopes, cancellation, account changes and failed/missing refreshes. Staff result entry remains unchanged.

### Real off-season execution test no longer silently skips

The previous phase-loop test skipped every off-day, including its off-season fixture, so a pass did not prove off-season execution. AR8 enumerates seven actual builder dates per phase and sport, requires at least one ready hitting day, and asserts every ready day has prep first, non-empty work, full-go with intent and log last. Off days are respected, not reopened. Both sports and all three phases are exercised without modifying training logic, volume, lifting, schedule, equipment or recovery gates. Independent pitching investigation found the existing day-specific rendering/logging path but no source-supported defect to patch; complete pitching/position acceptance remains open.

## Verification

- Focused final integration: **8 files / 174 tests PASS**, `/tmp/ar8-focused-final.log` (goal card, testing-day card/rules, day-84 rules, actual daily-plan audit, skill execution, practice context, six-cohort simulations).
- Fresh complete suite on final corrected code: **444 files / 3,598 tests PASS**, `/tmp/ar8-full-suite.log`.
- Automatic preview **build OK 2026-10-20 17:30:03 UTC**. Test-only Array.at target errors were replaced with indexed access before the full suite. Initial tightened execution test exposed an off-day fixture, not a production defect; the seven-day assertions prove ready sessions instead of changing the schedule.
- Authenticated injected player phone at **390×844**: production goal card on existing `/__evidence/roadmap-closeout`, five draft selections, Save enabled, no horizontal overflow, zero page errors. Screenshot `/tmp/browser/ar8/goal-order-phone.png` inspected. Browser script `/tmp/browser/ar8/check_goal_read.py`. **Read/draft only; Save never clicked.** This is not day-84 or dashboard hosted acceptance, testing-day phone acceptance, or coach/org/owner proof.

## Remaining blockers — no fabricated substitutes

- Coach/org UI needs authorized final skill-plan sharing and verified training-sharing consent; health consent and lifting rows cannot substitute. Scouts remain excluded. Today's/weekly focus, flags/drills, six-week summaries, practice ideas and What worked are not delivered in that section.
- Practice ~30% reduction and ranked weekly minute share need explicit real row floors/envelopes. Existing provenance/Because is not the reduction.
- Mixed signals and What worked need comparable canonical same-athlete/sport/category outcomes and approved mapping. A formatter, drill usage, engagement or a checked box is not effectiveness.
- Owner text/options persist as versioned prose; approved typed executable rules and hosted owner save/readback are still pending. No text turned into a training dose.
- Major recurrence has canonical sport/module report support; explicit severe-report and top-three mechanics-goal sources remain unresolved.
- Complete all-position and pitching full-go, new fix drill acceptance, positive athlete/coach/org/owner phone work, testing-day readback, exact TEST day-84 save/readback and hosted six-cohort changes/resolution still need acceptance.

No explicit TEST/backend writes, assessment changes, consent edits, ranking timestamp aging, password resets or test rows were made. No fixture cleanup required. TEST Coach subscription remains active. Existing scheduled-practice proof was not repeated. Amounts remain in cents.