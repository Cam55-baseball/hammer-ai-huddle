# AD8 — Logged steal-result honesty

PASS in preview, 2026-10-18 20:15 UTC. Ready to publish: no.

## Observed
- Two fresh affected TEST college-player visits at /games/reports, 390×844, mobile Safari user agent in Chromium.
- Selected Baserunning. Actual gp_baserun_events reads returned 200 with no entries. Steal success displayed Not enough data; no percentage. Entered/missing-result counts both zero; no page exceptions or horizontal overflow.
- Screenshots steal-1.png and report-2.png visually inspected.
- Separate browser-only 503 simulation: failure notice visible, no success values. Screenshot read-failure.png visually inspected. No backend failure or test entry was created.

## Changes and checks
- baserunningSummary counts only explicit boolean steal outcomes for success percentage; retains all logged steal attempts in the attempt count, and reports missing outcomes separately. Below ten entered outcomes, rates say early read.
- Five new rule tests cover no attempts, unknown-only, mixed known/unknown, genuine zero and the ten-known-result threshold.
- Entire game regression folder plus recordedPercentages: 11 files / 63 tests PASS. Latest preview diagnostic build OK.
- GameReports' four live event reads join nondeleted games; successful real empty reads verified, but removed-game positive fixtures were not inserted or browser-certified.
- Found sibling legacy gp_v_baserunning view: n includes unknown outcomes and removed games. LedgerSplitsPanel success percentage is suppressed rather than fabricating a corrected denominator. View, other split values and stored reports unchanged; view correction and populated positive proof remain open.

## Boundaries
- No TEST entries, measurements, consents, games or connections inserted/deleted. No data cleanup required. Coach subscription untouched, kept active.
- No publish, redeploy, migration, cron or iOS changes. Preview-only.
- Populated outcomes are unit-tested, not yet app-entered cohort proof. Mobile emulation is not physical Safari certification.
- Next: remaining B measured-grade/Game IQ and cohort/role proofs, then C–F.