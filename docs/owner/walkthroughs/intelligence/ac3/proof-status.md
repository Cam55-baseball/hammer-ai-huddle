# AC3 — Completed → Start → saved plan

**PASS for A2 / Oct 17 #7. Ready to publish: no; the remaining ordered work stays open.**

## Affected-player phone proof
- Actual kept TEST college player, not owner/admin; Chromium 390×844, `/dashboard`.
- Before: no assessment, no start flag, no prescriptions for October 18. Older September 25 plan preserved.
- Start disabled. Tapped **Completed** without answering any optional fields.
- Reload: completion persisted, assessment disappeared, Start enabled.
- Tapped **Start Hammers Today Plan**. Real generator returned 200, saved 13 prescription rows, and final validation recorded no errors. Saved-plan check returned 200 with `verified: true`.
- Opened a fresh browser context with only the player's auth restored—no plan/start device cache. Same 13 saved rows read through the actual plan screen; all fields and row identities matched. Only `verify_saved` called, not a second generation.
- Canonical saved-row SHA-256: `6658a6cd06cbe53fed17700b6c4699f74006e26bb62047686277293988c40732`.
- No page exceptions or horizontal overflow. Completion/Start instructions are plain and have one next action. This is desktop Chromium at phone size, not physical iPhone/Safari certification.

## Evidence
- `before-completed.png`: optional assessment and locked Start.
- `completed-unlocked.png`: completion saved after reload, unlocked Start.
- `saved-plan-readback.png`: actual persisted plan in a fresh browser session.
- Private baseline, post-start snapshots, call/result logs and cleanup evidence kept under `/tmp/browser/ac3/`; credentials and athlete record dumps are not copied to documentation.

## Cleanup
Backed up before mutation, then removed only 18 new TEST records: 1 assessment, 13 prescriptions, 1 CNS ledger, 1 generation diagnostic, 2 final-check swaps. Restored the original unstarted profile flag and three changed fields of one pre-existing TEST scheduling decision. Eight non-profile tables compare exactly to baseline; 20 historical prescriptions remain. Automatic profile update timestamp remains changed; no athlete fact changed. Test account and its original records preserved; no exercise completion, goals, injury, consent or payment changes made.

## Checks and remaining work
Assessment tests: **2 files / 11 tests PASS**. No application-source changes or new architecture decisions. No publish, migration, function redeploy, cron or iOS changes.

Next: A3 linked-parent optional-sharing positive path, then A4 and B–F. Original HEVC, actual iPhone Safari, all-format coverage and exact timing certification remain open from AC1–AC2.