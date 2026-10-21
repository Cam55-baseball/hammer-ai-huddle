# AU3 — Oct 21 Swap authority and candidate groundwork

**Ready to publish: no.** Preview changes only; no publish, deploy, migration, cron or iOS changes.

## Completed substantial sub-steps

### Close the unchecked legacy prescription path

The audit found a second active drill adjustment path in `HammerDailyPlan` → `DrillAdjustDialog` → `usePlanAdjustments` → `applyAdjustments`. It offered hardcoded names (machine timing → tee, loaded lifting → tempo/bodyweight, sled → wall march), copied dose strings without certification, and could remove a drill altogether. Stored name-only replacements also kept the original instructions while changing the exercise name. This bypassed the owner’s same-intent/dose/no-drop rules.

- Removed invented suggestion rules. Gear display hints now come only from explicit requirements, not drill names.
- The legacy dialog does not offer unchecked replacement or removal saves. It visibly keeps the original session and warns not to perform unavailable/unsafe work.
- `usePlanAdjustments.save` rejects unchecked swap/unavailable actions even if another caller bypasses the dialog. Existing position-work logging remains available.
- Previously saved legacy swap/unavailable rows no longer rename, re-dose or remove drills. They remain preserved in storage and produce a visible safety-check notice; original complete drill identity, equipment, setup, cues, stop conditions and stage stay intact. No test or real data rows deleted.
- Exact category matching prevents another category’s adjustment from affecting the block.

### Canonical universal candidate preview foundation

`universalSwapCandidates` is a pure, **not-yet-wired** candidate resolver, not a live prescription endpoint or AI conversation. It accepts canonical catalog identities and metadata rather than naming imagined alternatives.

- Requires exact category, explicit shared intent/adaptation, substitution family, unit, sport, active catalog, phase and training-age legality, age and injury restrictions, current permitted-session answer and confirmed availability.
- All original dose fields retained exactly; rejects invalid/missing recorded dose fields. Catalog defaults do not author volume.
- Equipment aliases normalize DB/dumbbells, KB/kettlebells and similar exact equivalents. Missing gear wins over present gear. Bodyweight, tier or remembered ownership cannot imply safe space, a partner, wall, bench or arbitrary equipment. Null equipment metadata is unknown, not equipment-free.
- Duplicate catalog identities are rejected as ambiguous. Unknown metadata or stopped session blocks previews rather than relaxing safety.
- Concrete tests: 30 machine reps → 30 partner flips with confirmed partner/screen/ball/net; no-barbell six-rep lifting retains tempo/load; 30-yard sprint retains 90 feet and cannot turn into timed marching or unconfirmed hallway running; 60-second recovery requires the same release intent, not a flexibility stretch. These are explicit test fixtures, **not claims of hosted catalog certification or the four requested phone successes**.

## Actual affected-player phone checks

Real TEST pitcher password-form sign-in at 390 × 844. Actual dashboard remains unfinished-assessment/start gated; no plan generated or gate bypassed (`actual-plan-gate.png`).

The real changed legacy dialog was rendered in a browser-only override of the existing development evidence page using the actual saved prescription’s name/identity/dose. The player saw no checked replacement, the original-session notice and safe-space warning; no Update action existed; Back closed the dialog. No adjustment writes occurred and canonical self-read adjustment IDs were unchanged. No page errors or horizontal overflow. Screenshot inspected: `/tmp/browser/au3/unchecked-swap-blocked.png`; log `/tmp/browser/au3/phone.log`.

**Boundary:** actual signed-in player / real changed component / actual saved identity, but isolated component rejection proof. Not positive current-plan full-go, testing-day or universal AI Swap/memory acceptance.

## Remaining facts and blockers

- Read-only live catalog count: 981 active rows; 499 lack explicit `primary_adaptation`, 66 lack family and 13 have null equipment metadata. These facts were not filled with guesses. Sparse metadata cannot establish the requested universal intent-equivalence proofs. Existing generator/catalog mapping must be traced and reviewed before any metadata enrichment; no bulk authoring applied.
- Fresh one-row atomic server certification, concurrency-safe receipt/dose write and availability-memory transaction remain unimplemented. Existing generator persistence is not a suitable one-row swap endpoint, and generation-time/client ladders cannot authorize universal swaps.
- AI conversation, today/always memory, four positive phone proofs and equipment-question removal remain open. Up-front questions retained until a working safe replacement exists.
- Coach six-week live wiring and protected TEST ADMIN exclusion still await named staged server-access correction authorization. No broader scout/coach read or unrelated migration applied.
- Positive full-go pitching/all-position fielding/baserunning and testing-day/mixed-signal hosted cases remain unproved; actual inspected TEST player is start-gated. Eligible affected-role real inputs required, never fabricated outputs.
- Nightly result retained from actual Oct 21 04:30 proof: scheduled job/callback HTTP 200 complete, players 0 / checked 0 / pending 0. Empty success, not a positive comparable outcome. No job triggered or schedule changed.

## Tests and cleanup

- Changed-path run: 10 files / 188 tests PASS before the final extra invalid-dose test. Final fresh full suite includes all changes: **467 distinct files / 3,764 tests PASS**, four disjoint batches: 905 + 865 + 964 + 1,030 (`/tmp/au3-full-{0,1,2,3}.log`, `/tmp/au3-test-manifest.json`). Latest preview build OK.
- TEST password privately scrambled; credential file removed. No prescription, measurement, training log or adjustment records created/changed by this turn’s browser proof. Existing Coach subscription retained.