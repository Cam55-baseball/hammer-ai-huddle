# AU4 — Saved-work concurrency and first-receipt protection

**Ready to publish: no.** Preview code only. No publish, deploy, migration, cron or iOS changes.

## Completed

1. Existing saved-row Swap and Undo now conditionally compare all eight displayed dose fields in addition to self, date, movement, status and the exact why payload. A concurrent generator/user edit to sets, reps, duration, distance, total reps, unit, tempo or load can no longer be overwritten by a stale client whose old receipt is unchanged.
2. Added predicates for actual saved intensity/density/RIR, execution intent, per-side/open-ended/set-range context, name, substitution identity and plan placement when present. Rest carried in the why payload remains covered by the exact payload predicate; **there is no `rest_seconds` or `intensity` column on `wk_prescriptions`**. No nonexistent-column predicate remains. Neither apply nor Undo authors new rest/intensity or placement.
3. The visit's plan date must match the selected row. Missing/non-finite recorded dose is rejected before either write.
4. Chained Swap and Undo now require the current eight dose fields to match the first-prescription receipt exactly. If the generator has legitimately changed the dose since that receipt, neither action can restore the outdated amount of work. Fail visibly with reload rather than selecting which competing dose to invent.
5. First receipts validate all eight recorded fields, not just unit agreement. Original missing/null cues remain preserved.

These are strengthened **existing client conditional writes**, not the fresh universal server-certification boundary. Catalog defaults still do not author dose. No universal AI/memory rollout or equipment-question removal occurred.

## Phone proof

- Real TEST pitcher password-form sign-in, 390 × 844 Chromium phone emulation.
- Browser-only existing evidence-page override fetches the actual saved prescription through the authenticated client; no manufactured row. This isolated existing-alternative proof does not bypass the actual dashboard's assessment/start gate or claim current-plan/full-go acceptance.
- Actual Lateral DB Step-Up → Reverse Lunge — Athletic save and UI readback, then actual Undo. All eight dose fields unchanged; intensity mode, density/RIR and placement unchanged; receipt confirmed; original identity/name/cue/payload restored. The only retained row difference was the normal `updated_at` timestamp.
- Screenshots inspected: `/tmp/browser/au4/swap-saved.png` and `swap-restored.png`. Saved and restored exercise names and prescribed **1 set × 6 reps** visible. No page errors or horizontal overflow. Log `/tmp/browser/au4/phone.log`.
- Initial proof assertion incorrectly assumed standalone rest/intensity fields; it stopped, restored the exact TEST row and scrambled the password. Diagnosed against actual schema/row shape, corrected predicates and assertions, then reran successfully. Prior type error in a test fixture was corrected; latest preview build OK. No unexplained error or deployment.
- Concurrency/date/receipt rejection paths exercised with concrete tests, not intentional mutation of a live athlete's training dose.

## Independent certification audit

Read-only audit confirms existing ladders and family/category/unit agreement cannot alone certify equivalent intent/workload. Canonical mappings in `scripts/stage2/appendix-a.ts` carry cost/recovery/risk metadata; they cannot silently supply missing intent equivalence. Universal apply and Undo still need one authenticated server transaction: fresh canonical source/target and athlete safety/access reads, exact intent/category/dose/rest legality, availability and receipt/version comparison, atomic same-row persistence plus availability memory. Nothing applied live.

## Validation and cleanup

- Changed-path suite: **5 files / 36 tests PASS**.
- Fresh full suite: **467 distinct files / 3,772 tests PASS**; disjoint batches 905 + 867 + 964 + 1,036. `/tmp/au4-full-{0,1,2,3}.log`; `/tmp/au4-test-manifest.json`.
- Exact TEST row restored via real Undo; no measurement/log/adjustment rows added. TEST password scrambled and private credential file removed. Coach subscription retained.
- Actual nightly result remains the recorded Oct 21 04:30 UTC empty success (HTTP 200; players/checked/pending all 0). No new positive outcome claimed, trigger or schedule change.

## Remaining

Universal server certification + AI conversation + today/always memory + four positive phone proofs remain incomplete; keep questions until replacement works. Missing canonical intent metadata still cannot be invented. Coach live-access corrections and TEST ADMIN filtering need named staged server-change authorization. Eligible actual-plan full-go, both-sport conditioning, linked mixed signals/testing-day and remaining owner screens need their real affected-role cases. A positive nightly outcome requires genuine eligible comparable evidence.