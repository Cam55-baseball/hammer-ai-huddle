# AU6 — Saved-context and in-flight Swap safety

**Ready to publish: no.** No publish, deployment, migration, cron or iOS changes. Universal Swap remains staged and unmounted; no AI or hosted atomic transaction claimed.

## Substantial completed steps

- Added `swapSnapshot` validation for complete saved rest/intensity/CNS/phase/placement/side/execution/provenance context, using actual `wk_prescriptions` field names. Missing fields and undefined/non-finite JSON fail before transport; explicit null remains absence, never a catalog default. Payload comparison ignores only replacement cue and substitution receipt; other keys, including rest and PAP, must match. JSON object key order alone does not falsely fail.
- `atomicSwap` now validates immutable context as well as eight dose fields, uses a private pre-await snapshot so transport/caller mutation cannot rewrite the guard, and requires a valid strictly newer returned row version. These client checks do not replace server locks, current access or certification.
- Independent read-only review identified late-account callbacks and ambiguous retries. The sheet suppresses old/unmounted visit results; only one write attempt is allowed for its current version. Unconfirmed outcomes block retry and Start again, including after close/reopen, pending fresh server reconciliation. No cancellation or rollback is falsely implied; server idempotency is still required.
- Existing equipment questions remain until the replacement is genuinely available. No unavailable every-card control advertised on live athlete routes.

## Concrete tests

- Preserve 30 reps and 30-second rest; reject a returned 5-second rest.
- Preserve 180-second saved/PAP rest; reject 30-second rest or 60-second primer rest.
- Changed density/intensity/CNS/phase/placement/side/execution/provenance, missing columns, undefined JSON and NaN fail closed.
- Unchanged/older/malformed server timestamps do not confirm a save.
- Mutated transport snapshot cannot validate 33 reps as the original 30.
- Timed-out possible commit results in one write only; close/reopen does not unlock it.
- Completed old-account request never invokes the new account's saved callback.

Positive transaction tests use a fake transport only, not hosted certification. Fresh complete suite: **471 distinct files / 3,795 passing tests**: 469 `.test` files in four disjoint batches (998 + 883 + 919 + 986), plus the prior two `.spec` files (9). Logs `/tmp/au6-full-{0,1,2,3}.log`, `/tmp/au6-full-spec.log`. The initial 469-file selection missed the two prior spec files; coverage comparison caught this and both were run successfully before reporting completion. Latest preview build OK; temporary missing-fixture-context errors during edit sequencing resolved by complete fixtures.

## Phone and cleanup

Real TEST pitcher password-form sign-in at 390×844; actual saved Lateral DB Step-Up row and catalog fetched self-scoped. Staged sheet rendered only via browser-only evidence-page override. Three questions/Always worked; unknown current safety and absent transport correctly blocked replacement. Actual prescription and all self-scoped equipment rows reread exactly unchanged; zero page errors/overflow. Inspected `/tmp/browser/au6/blocked-phone.png`; harness/log `/tmp/browser/au6/conversation_phone.py`, `phone.log`.

This is a negative staged safety check, not a released route, physical iPhone, four positive swaps or memory save. TEST password scrambled in finally and private credentials removed. No plan, equipment, connection or measurement writes. TEST Coach subscription retained.

## Remaining gates

Server atomic certification/current authority/metadata and AI integration remain unfinished; four positive athlete phone saves and equipment-question replacement cannot be claimed. Named live schema/permission authorization still needed before applying those changes. Coach six-week reads and TEST ADMIN live exclusion await their staged authorization/proofs. Eligible actual-plan full-go/both-sport conditioning and genuine mixed signals/testing day/owner-screen evidence remain open. Recorded 04:30 callback is HTTP 200, 0/0/0, not positive learning evidence; no newer result claimed and no manual trigger/schedule changes.