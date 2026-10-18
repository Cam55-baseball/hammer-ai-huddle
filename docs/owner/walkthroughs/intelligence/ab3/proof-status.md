# AB3 — Step 5 game-event details
Ready to publish: NO.

## Proven
- Signed in through password API as the kept college test player; 390×844 phone.
- Actual zone 7 and intended zone 3, contact observation hard, direction pull ground, explicit hard-contact Yes saved to separate nullable pitch fields, then read back through a fresh page navigation and the database. Notes stayed null. These are logger observations, not measured speed or a threshold-derived hard-hit rate.
- Local test CSV (synthetic fixture, not real athlete evidence) committed via Import to an at-bat. Database and phone read-back both showed Imported.
- False self-entered Coach-verified source normalized to Player-entered; Video-tagged without a saved clip refused.
- Missing contact/intent stays null; explicit hard-contact No stays false. Hidden contact selections are cleared on non-in-play results or hitter perspective. Unit tests assert these rules.
- Full suite: 378 files / 2,978 tests passed. Focused: 3 files / 13 tests. Build log: OK.
- Exact temporary game, pitch, at-bats and import job removed; game read-back confirmed absent.

## Regression found and corrected
GameTotalsHeader reused full logger query keys while selecting only perspective/result summaries. On reopening, pitch rows lost their source and details in the cache. Totals now have a separate suffix; prefix invalidation still refreshes them. Regression test verifies complete saved rows remain intact. Phone read-back passed after correction.

## Status and limits
- Authorized additive schema applied; frontend changes remain preview-only. No publishing, function redeploy, cron or iOS changes.
- Parent updated legal acceptance remains uncompleted; no bypass. Teen and both coach entry paths are not certified.
- Five required populated player cohorts remain unproven; no fake history or reports created.
- Document import needs an authorization review before certification; no claim that all import paths are proved.
- Historical pitch notes untouched and unparsed. Report consumers are not yet claiming these annotations as Game IQ insights.
- Step 6 Game IQ/team reports, step 7 Coaching Console, step 8 private population learning remain unfinished.
- Imported at-bat source passed; existing card title shows “at-bat started (no result yet)” despite the Double result badge. Result-title consistency remains unverified.

Screenshots: structured-pitch.png, imported-at-bat.png. Both show only a temporary test account/game.
