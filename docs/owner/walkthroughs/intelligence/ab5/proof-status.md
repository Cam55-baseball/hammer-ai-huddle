# AB5 — Document review and confirmation
Ready to publish: NO.

## Proven as the kept player on a phone (390×844)
- Explicitly synthetic scorebook photo uploaded through the UI; live extraction saved a draft and zero live game entries.
- Saved draft survives reload. Nothing selected by default; Add selected entries disabled until review selection.
- Checkbox selection and explicit confirmation save one at-bat; confirmed status survives reload, no confirmation button remains.
- At-Bats reads back Double (2B), Logged by: Imported. Missing exit speed, contact quality and RBI remain null. No horizontal overflow.
- Concurrent repeated confirmations return already_applied with exactly one event.
- Signed-out confirmation refused, fresh password-signed-in different kept player refused.
- Empty, duplicate, negative/out-of-range selections refused. A valid at-bat followed by invalid defense rolls back the entire call (no partial insert).
- Four-family synthetic draft confirmation adds only selected at-bat/pitch/defense/baserun rows. Unknown result stays null with original raw text in notes; absent pitch speed, success, error/assist/putout remain null.
- Ready and applied documents cannot be re-extracted (409), so extraction cannot reset confirmation or overwrite review history.
- Exact temporary game, documents, all event families and every uploaded storage object removed. Fixtures are not real athletic performance and do not satisfy populated cohort proof.

## Changes / live status
- Migration 0078_confirm_game_document_review applied LIVE, no new tables or access broadening: SECURITY INVOKER, caller RLS, explicit document and non-deleted game ownership, row lock, transactional inserts and applied marker. Public/anonymous execution revoked; authenticated execution granted.
- Existing gp_documents parsed_events retains raw extraction, selected indices, confirmed timestamp/caller, inserted event IDs. No parallel source of truth.
- gp-ingest-document scoped redeploy LIVE; source SHA-256 513a70fc10f1430263761d74852bf21f737a30b551c9c2a45170507ca2d52506. Live owned extraction and ready/applied refusals passed.
- Frontend preview only, no publish, cron or iOS changes.
- Full suite 380 files / 2,991 tests PASS; focused 17/17; build OK after resolving older string-library compatibility error.

## Remaining
Parent/teen/both-coach logging proof, consent acceptance and unresolved demo Coach checkout remain open. Required five genuinely populated player cohorts, steps 6–8 and full page audit remain incomplete. No consent/payment bypass, no fabricated measurements. Owner still applies nightly schedule SQL separately.

Evidence: review.png, confirmed.png, readback.png (explicitly synthetic fixture, test account only).
