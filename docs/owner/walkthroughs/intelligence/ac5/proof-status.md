# A4 part 1 — populated phone History

Overall: FAIL on the every-value labeling requirement; populated History and cleanup passed. No application code was changed.

## Checks

- PASS — authenticated as the kept TEST college player, democollege (requested player identity verified with the auth service, not an owner account).
- PASS — snapshotted all four History source tables before creating data; each contained zero rows for this player. See `before-snapshot.json` and `games-before.png` (the app game-entry screen before changes).
- PASS — entered two games through the app: Games → New game → Opponent → Open game sheet. Opponents were `TEST A4 History 1` and `TEST A4 History 2`; no direct inserts or mocked responses were used. These are saved draft game records, not completed games or generated reports.
- PASS — `/history` → Games showed both persisted entries and a count of 2. See `history-populated.png`.
- PASS — a separate Chromium browser context restored only the player's session, opened History, reloaded, and expanded Games; both entries read back from saved data. See `history-fresh-reload.png`.
- PASS — both evidence images are viewport-cropped 390 × 844 phone screenshots, not full-page captures or desktop resizes. Reviewed both images visually.
- PASS — no browser page errors in either proof context; no HTTP error responses observed in the primary proof context.
- PASS — no horizontal overflow: viewport, document scroll width and body scroll width all measured 390 pixels in both History contexts.
- FAIL — every value is not explicitly labeled: each game displays the date and “Draft” without “Date” and “Status” labels; opponent uses only “vs”, and the count badge has no explicit “games” unit inside it (the Games heading provides context). Source: `src/pages/History.tsx`, game row rendering. Missing game type also leaves an empty separator in the text. Reported, not fixed, per scope.
- PASS — focused Vitest run: `bunx vitest run src/components/__tests__/gameReportSources.test.tsx src/components/__tests__/gameTotalsCache.test.tsx`; 2 files, 4 tests passed. These cover game-source scoping/deletion and cache behavior, not the entire History UI.

## Cleanup

- Created: 2 `gp_games` rows.
- Backed up before deletion: 2 full rows in `test-rows-backup.json`.
- Deleted: exactly those 2 rows, constrained by both the verified player ID and the captured row IDs; both TEST opponent markers verified before deletion.
- Zero-row read-back: PASS — querying those exact IDs returned 0 rows.
- All four player-scoped History source tables returned to their initial zero counts: games 0, reports 0, practices 0, recaps 0.
- No pre-existing rows deleted; the kept TEST player remains. No source edits, migrations, publishing, deployments, or iOS changes.

## Files written

In `docs/owner/walkthroughs/intelligence/ac5/`:

- `history-populated.png`
- `history-fresh-reload.png`
- `games-before.png`
- `before-snapshot.json`
- `test-rows-backup.json`
- `proof-status.md`

Temporary browser scripts, session material and raw diagnostics remain outside the repository under `/tmp/browser/a4/`; no session credentials or backend addresses are included in these proof files.
