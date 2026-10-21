# AV5 — Live plan-write coordination for Universal Swap

## Applied, not staged

Named authorization covers this Universal Swap prerequisite. `0092_shared_plan_day_transaction_lock.sql` installs `wk_lock_plan_day` and injects it at the first block opening of the hosted `wk_persist_prescriptions_atomic` and `wk_adjust_prescriptions_atomic`. Existing statements, dose rules, function signatures and grants remain intact; the pre-change definitions are snapshotted under `/tmp/av5/plan-writers-before.txt`.

Both writers acquire the same transaction-held advisory lock for athlete UUID + plan date before inspecting or replacing prescriptions. The future certifier must acquire this same lock. The expiring job claim is not a substitute. This is not an implemented swap save.

## Verification

- Hosted read: both actual writer definitions contain the lock call.
- Hosted permissions: anonymous false, authenticated false, service role true for helper execution; existing writer grants unchanged.
- Actual TEST player signed in through the real form at 390×844, visited `/dashboard`, opened Lift → Resist-Turning Press → Swap. Screenshot: `/tmp/browser/av5/locked-plan-phone.png`.
- Existing live saved-plan verification returned HTTP 200, `verified: true`.
- Complete saved prescription read before/after was equal; no training, equipment or measurement changes. TEST password scrambled in `finally`.
- Changed lock/atomic contract tests: 2 files / 12 tests PASS.
- Fresh full suite: 481 files / 3,839 tests PASS, 16:49:24 UTC start.
- Latest preview build: OK, 16:48:15 UTC.
- Attempted direct simultaneous SQL lock test was denied by the read-only query role's helper-execute permission. That is an expected security boundary, not a training failure. Contention timing is not claimed verified.

## Remaining named acceptance

Atomic source/target/anchor certification, fresh canonical access/safety, first receipt/Undo, inventory + memory + log transaction, all four positive saved phone swaps, every-card/coach work coverage and equipment-question replacement remain unfinished. No partial client save was enabled. TEST pitcher accounts inspected have no saved prescriptions for Oct 21; full-go phone acceptance was not fabricated. The organization testing screen still lacks this TEST account's active Organization entitlement; no bypass performed.

Nightly: last recorded Oct 21 04:30 callback HTTP 200, 0/0/0, empty rather than positive. No new app-entered pair and no future outcome claimed. No publish, cron or iOS changes.

**Ready to publish: no.**