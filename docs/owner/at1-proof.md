# AT1 proof — 2026-10-20

## Done this run
- Restored democoach through an actual newly created Stripe Coach subscription with a one-redemption 100%-off, forever TEST-only coupon. Invoice status paid; total **0 cents**. Existing products/prices/real subscriptions untouched. Webhook synchronized app plan to active. Keep this TEST subscription active until every coach proof finishes, as previously authorized; do not cancel between runs. Private Stripe snapshots under `/tmp/browser/at1/`.
- Real password-form phone sign-in as TEST ADMIN: `/iq` loaded its situations and **Internal — not released** label. `/owner/exercise-vault` loaded the Needs owner review drills and edit controls. Both at 390×844, no horizontal overflow. Read-only, no AI inference or review approval submitted.
- Found internal label overlapping Start Here. Moved it into normal document flow and rechecked phone screenshot `/tmp/browser/at1/game-iq.png`.
- Real democoach and TEST college athlete accepted a coaching connection using `send_connection_request` / `respond_connection_request`. Development opened and returned a saved plan via `coach_athlete_plan`; separate health-sharing notice visible. Screenshot `/tmp/browser/at1/coach-plan.png` inspected. This proves positive saved-plan access, not the entire coach specification: snapshot has no Because lines, full-go stages or weekly summaries, and no followed outcomes.
- Found old snapshot advertised unreleased Game IQ to coach for athlete. `visibleCoachPlanBlocks` now excludes it through the central release switch (even if viewer is owner/admin), retains ready skills and suppresses off-day rows. Regression test and real phone recheck prove removal. No stored plan modified or deleted.
- Weekly goal extra-slot availability now counts included scheduled strength/speed days, not only skills. Regression fixture proves 3 skill days fit but two further lifting/sprint days refuse the extra without baseline change.
- Actual builder eight-week tests in both sports: hitting-first adds exactly **8** scheduled hitting days; second-ranked fielding leads shared ready skill slots; every existing baseline skill day remains; lifting drills, duration, status and stop rules are unchanged. Uses existing Build-rung off-season slots. A first attempt asking for extra fielding failed correctly because that rung already uses all phase-template fielding slots; changed test case to the allowed hitting slot, not engine permissions.
- Existing six subscription-qualified eight-week actual-builder simulations continue passing (access, fault change/clean resolution, wrong-sport isolation, practice context, injury and game-eve protections). These are deterministic simulations, not hosted six-cohort screenshots.
- Targeted final checks: **3 files / 24 tests PASS**, `/tmp/at1-builder.log`.
- Final fresh full suite after actual-builder additions: **453 files / 3,657 tests PASS**, `/tmp/at1-final-full-suite.log`; preview build OK.

## Cleanup and limits
- TEST passwords scrambled after each phone proof. Exact TEST AT1 coaching request snapshotted, connection ended via canonical RPC, exact request removed. No real owner login or data changed. No athlete plan generated or fabricated for proof.
- TEST ADMIN remains system-marked/ranking-excluded, but universal hidden-from-lists remains unproved. Connection search's exact-email exception and admin-search-users still require a deliberate targeted backend change; no roles/access/consent shortcuts used.
- TEST Game IQ read is positive; Report Card with a genuine measurement-bearing saved TEST analysis and Vault edit/save/readback remain open. Reading the review queue alone is not review completion.
- Positive coach full-scope proof still needs athlete to complete setup/start and save an actual current final plan with evidence Because, execution, six-week data and outcomes. `/my-daily-game-plan` is the task checklist, not Hammers Today. Org plan is not active; positive assigned-org proof remains open.
- Execution, mixed signals and testing-day details phone acceptance, subscription-scoped goal counts/screenshots remain open. No claim of full future arm-ledger/day-cap certification.
- Existing nightly schedule re-read: active **30 4 * * ***. Next run Oct 21 04:30 UTC has not occurred. No cron change, no repeat function deploy, no publish, no iOS edits.

**Ready to publish: NO.**