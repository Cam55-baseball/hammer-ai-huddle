# AB4 — Step 5 import safety and honest results
Ready to publish: NO.

## Verified
- Kept test player, password API sign-in, phone 390×844.
- Synthetic CSV Double saves as canonical 2B, shows “1st inning — Double to left field” and “Logged by: Imported”; saved speed/angle remain real input values, contact quality null (no invented barrel).
- HitTrax and GameChanger normalize exact result aliases. Unknown outcomes remain null with raw imported text in notes; batted-ball Type is never treated as an at-bat outcome.
- Structured pitcher details still survive navigation; forged coach source normalized and video source without evidence refused.
- Document importer verifies caller ownership of saved document and non-deleted game, exact stored storage object, and allowed bucket before privileged file download.
- Live wrong object/wrong bucket/missing document return 403; signed out returns 401.
- Own explicitly synthetic scorebook photo returns one extracted at-bat in the existing document review buffer. Saved review_status=pending; all four event ledgers remain empty.
- Player phone photo upload succeeds, displays 1 AB draft, no horizontal overflow, and still adds zero live events.
- Temporary games, documents, storage files and CSV events/import jobs removed with exact scoping.
- Build OK. Full suite 379 files / 2,988 tests passed before final status/source fixes; focused 14/14 and live phone checks passed after final fixes.

## Bugs diagnosed
- Vendor Double was stored verbatim, so result title incorrectly claimed no outcome. Canonical exact alias mapping fixes both CSV siblings.
- Document UI used disallowed source=upload and status=uploaded; function used processing/processed/error instead of parsing/ready/failed. Corrected to existing schema values, no migration.
- Authentication alone had allowed arbitrary privileged bucket/path/document/game references. Ownership gate added, tested and scoped function redeployed.
- Old importer claimed drafts but inserted immediately into live events; no actual draft field existed. Extraction now stays on the existing gp_documents review buffer. No historical event changes.

## Live / pending
- gp-ingest-document authorized scoped redeploy LIVE; authenticated extraction/refusal checks passed.
- Frontend preview only. No publish, cron or iOS changes.
- Explicit draft review/confirm and reload UI remains unfinished: document upload is not yet a complete import-to-event flow. Current UI tells the truth; drafts do not count.
- Parent legal gate remains uncompleted; never bypassed. Teen and both coach paid-path proof still open; demo Coach checkout unresolved.
- Required five populated cohorts and steps 6–8 remain incomplete. No synthetic fixture claimed as real athlete evidence.

Screenshots: imported-at-bat.png; document-draft.png (temporary test account and explicitly synthetic fixture only).
