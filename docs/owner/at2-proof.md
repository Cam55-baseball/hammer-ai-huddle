# AT2 — Coach saved-week work and proof

## Completed
- Coach plan now shows the **returned saved explanation** when an explicit Because list is empty; no guessed reasons and no attempt to restore server-redacted health text. Existing explicit Because stays first. Drill prep/game-speed/log stages and saved cues remain visible.
- Added deliberately opened **Saved work — last 7 days**: today plus up to six earlier calendar dates, each read through the existing `coach_athlete_plan` RPC. No new endpoint, table, migration or deployment. Each date retains accepted-connection checks and server health-sharing redaction. Only successful same-sport returned snapshots display. Missing dates are not reconstructed or counted as completed training.
- History expansion is athlete/date scoped, so switching athletes cannot carry an expanded old history. Current denial hides the whole section; failed history reads show an error instead of treating missing evidence as success. Existing unshared Game IQ remains suppressed in every saved day.
- Empty successful outcome reads now say **Need more data**; failed outcome reads are visible failures, not an empty result.
- Real democoach and TEST college athlete phone form sign-ins, 390×844. Created and accepted exact TEST AT2 coaching request through canonical RPCs. Opened Development, verified **8 returned saved reasons**, expanded/collapsed recent work, successful honest empty history and outcome states, no Game IQ prescriptions, no horizontal overflow. No generated/fabricated prior plan or outcome was inserted. Screenshots `/tmp/browser/at2/coach-plan.png` and `history-button.png`; log `coach_history.log`.
- Ended connection through `end_connection`, snapshotted exact request, removed only matching TEST AT2 request. Both passwords scrambled. TEST Coach subscription remains active as authorized.
- Added final snapshot preservation tests against actual softball builder: exact final reasons, dose, duration, prep/full-go/log stages and cues persist; empty blocks stay empty. Added history source/privacy/calendar tests and component tests for deliberate gated reads, player-switch isolation and revocation.
- Focused tests: **5 files / 13 PASS**, `/tmp/at2-focused.log`.
- Fresh default full suite hit **three timeouts**, not failed safety assertions. Reproduced all three files with one worker: **19 PASS**; no timeout threshold or assertion weakened. Final entire suite with two workers: **456 files / 3,665 PASS**, `/tmp/at2-final-full-suite.log`. Latest preview build OK.

## Remaining, not claimed complete
- Saved-week positive multi-day hosted view needs real prior saved TEST plans; this run proves the actual missing-history state and gated positive today read. It does not fabricate a full week or mark prescribed work complete.
- Current Today evidence Because/execution, six-week confidence totals, issue-linked practice ideas and assigned-org hosted acceptance remain open; recent saved work does not replace those requirements.
- Read-only visibility audit confirms `is_system_account` is not a universal visibility flag: connection exact-email discovery deliberately allows demo athletes, owner service-role search bypasses profile policies, and org roster RPC returns active membership. A dedicated protected TEST ADMIN exclusion is needed across those surfaces; no broad exclusion or role change was applied. Keep this item open rather than claiming universal hiding.
- Measured Report Card, Vault review save/readback, execution/mixed-signals/testing-day phone acceptance, and complete hosted six-cohort screenshots remain open.
- Next nightly run is still future (Oct 21 04:30 UTC). No publish, function deploy, migration, cron change or iOS edit this run.

**Ready to publish: NO.**