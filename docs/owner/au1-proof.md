# AU1 — Oct 21 continuation

## Delivered

- Conditioning now has a single session base counter shared across exercise log portals. Confirming a rep starts the rest clock immediately; changing exercise logs preserves both the bases and the original clock. Counter actions do not write training or completions. Existing lifting and PAP rest are unchanged.
- Phone reproduction resolved: the prior attempts interacted before the opening sequence finished. Waiting for the rendered heading and stable button permits the existing pop-up flow; no pop-up implementation rewrite was needed.
- Real TEST pitcher signed in through the actual phone form at 390×844. Existing evidence-row single sequence showed 30 seconds, then 5 minutes/reset after four singles, with zero page errors/overflow. This is component acceptance, not a live prescribed day.
- A second phone check fetched the actual TEST pitcher's saved Sep 25 `bases_1st_3rd` prescription (one set, six reps) under the player's session and rendered that exact row through the existing evidence page using a browser-only response override. Two confirmed doubles produced 30 seconds, then 300 seconds/reset; clock visibly ran. Full saved row readback was byte-equivalent afterward. Screenshots inspected: `/tmp/browser/au1/saved-double-first.png`, `saved-double-home.png`; script/log: `conditioning_saved_phone.py`, `saved-proof.log`. This is actual saved-row/component acceptance, NOT current-plan-route acceptance or a physical iPhone test.
- Existing alternatives now reject changed/unknown dose units, preserve all original dose fields even for short-on-time choices, require explicit phase/category eligibility, and cannot unlock competitive-phase eccentric overload. Apply/Undo are explicitly self/date/movement/status-scoped and require one returned row before success. Undo restores a complete stored dose including explicit nulls; incomplete legacy receipts fail visibly rather than inventing catalog defaults. These are safety prerequisites, NOT the requested every-card AI conversation or full fresh server certification.
- Mixed-signal evidence no longer labels missing/empty/unmeasured answers clean, counts explicit false as a problem, or accepts future recording dates/invalid percentages. Clean direction reuses the canonical assessed-fault allowlist; mandatory unassessed false placeholders are not evidence.
- Testing-day notice is now also mounted in the actual Hammers Today before-start area; prior morning-success placement remains. Read-only self/date/refetch/cancellation tests pass. No TEST athlete currently linked to an organization/testing day was manufactured for a positive hosted proof.
- Built the pure six-week coach summary projection: exactly 42 device calendar dates, distinct same-sport saved category days, exact saved issue-selected practice drills/reasons/doses. Missing days are not completion or effectiveness. It is deliberately NOT connected to a broader read through the known legacy coach/scout access gap; no permission migration applied.

## Still open / specific blockers

- Universal AI Swap, canonical today/always availability persistence, current server certification/atomic receipt and four affected-player save/readback proofs remain implementation work. No AI call was added or tested. Up-front questions remain until their safe replacement works.
- No-open-field exact-dose sprint replacement lacks certified safe-space/intent metadata; wall drills/jumps cannot be represented as equal sprint-distance work. Live catalog also contains inconsistent gear/distance metadata (e.g. goblet squat declares barbell/rack; softball repeated sprint is 43 feet, not a base). No silent relabel or catalog mutation applied.
- Coach live six-week reads/practice ideas require the named staged access correction (`at5-coach-training-access.pending.sql`) to be separately owner-authorized and proved; current queue explicitly authorizes rest/Swap redeploys, not that pending permission migration. Accepted coaching connection is the owner-approved training-sharing contract; health remains separate. No new training-consent question is requested.
- Full-go pitching/all-position fielding/baserunning positive phone acceptance, genuine mixed-signal/testing-day cases, and remaining TEST ADMIN screens/list exclusion remain open. Existing execution tests pass but do not close hosted acceptance.
- Actual scheduled learning-loop evidence must be read after Oct 21 04:30 UTC; enqueue success alone is never judging proof. No manual call or schedule change.

## Tests and cleanup

- Initial fresh full suite: 460 distinct files / 3,723 tests PASS in four disjoint bounded batches (`/tmp/au1-full-{0,1,2,3}.log`, manifest `/tmp/au1-test-manifest.json`). Final assessed-placeholder and exact Undo refinements subsequently passed focused tests; final complete-suite rerun status is recorded in roadmap before closing.
- Every real TEST-form proof used a private one-time password, scrambled in `finally`; private password file deleted after every attempt. Real owner password unchanged. No new training, equipment, position, goals, connections, testing days or measurements authored; actual saved conditioning row reread unchanged. TEST Coach service stays active.
- No publish, backend deployment, migration, cron or iOS changes during AU1.

**Ready to publish: no.**