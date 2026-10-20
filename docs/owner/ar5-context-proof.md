# AR5 context proof — October 20, 2026

## Preview changes proved

- `planAnalysisAccess.ts` now rebuilds partially accessible root-pattern groups using the existing canonical `rankFaults` function and owned sport-scoped clip evidence supplied by `planFaultContext`. Removing pitching from a 5Tool account (or hitting from Complete Pitcher) removes that signal's score, sample count, latest observation, wording and clear-state influence. The result is sorted again before the existing top-three overlay. Fully accessible groups remain unchanged. A partially filtered faded group without canonical clips fails closed instead of reconstructing evidence from a multiplier.
- Eight new tests cover both sports, exact eligible-only scores/samples, changed ordering, independent clean resolution, opposite-sport access and Complete Pitcher restrictions. Existing six 56-day actual-builder simulations pass; these are not hosted player acceptance.
- Actual ready skill blocks now carry `practiceContext`: category, exact source IDs, sessions, entered minutes/intensity-minutes, missing minute/intensity counts and consecutive days. One logged day is traced even without a heavy streak. It adds no performance verdict, learning result, recovery prescription or dose. Same-category streak Because still works; missing floors still leave volume unchanged. Closed cards, strength/recovery and pitching-versus-throwing remain isolated. Three new actual-builder/exact-route tests pass.
- Goal re-ask uses the device's calendar date, including the local date of the saved canonical timestamp. Day 84 no longer waits for a late-night confirmation's elapsed hours. Invalid/rolled-over dates and future confirmations are not due. Three new date-boundary tests pass; the save source remains `athlete_context.category_goals.updatedAt`.

## Verification

- Focused run: six files, 44 tests passed (`/tmp/ar5-focused.log`).
- Fresh full suite: 437 files, 3,558 tests passed (`/tmp/ar5-full-suite.log`).
- Automatic preview build OK; no deployment, migration, switch, cron or iOS change.
- Real injected player, 390×844: `/dashboard` shows initial assessment **1 of 6 done**, not an eligible goal reminder/finished daily plan. Screenshot `/tmp/browser/ar5/dashboard-phone.png`, checked visually; no overflow or page errors. No ranking save, assessment completion/skip, consent change, TEST timestamp aging, password or backend data writes. This is blocked-state proof only, not positive end-to-end acceptance.
- `/today` is a separate runtime route, not the `HammerDailyPlan` surface; its screenshot is not goal-reask proof. Corrected investigation to the actual dashboard rather than asserting absence there establishes reminder eligibility.

## Exact unresolved sources

Mixed video/game/practice verdicts remain unwired: game chase/whiff/error outcomes do not explicitly assess the canonical mechanical fault key, and logged duration/intensity or absence of an issue is not a clean performance result. `mixedSignals` accepts caller-authored directions without sport/task lineage. No arbitrary cross-source mapping or positive finding was added.

Practice ~30% reduction and bigger weekly goal-minute shares remain open: current free-text skill doses do not declare structured minimums. Parsing a stated dose or using synthetic test floors would invent training authority. This change records real load and missingness, not completion of the reduction.

Learning outcomes remain server-owned `intel-recheck` comparisons. A served drill, task check-off, clean clip or practice streak does not establish “It worked.” No new outcome store or client-authored result.

Coach section remains blocked on an authorized canonical final-plan capture/read contract and verified coach training-sharing consent. No health-consent substitution, report endpoint widening or separate plan store. Owner/coach/org/athlete positive phone readback, testing-day details, 12-week save/readback, full position/pitching execution and hosted six-cohort acceptance remain open.