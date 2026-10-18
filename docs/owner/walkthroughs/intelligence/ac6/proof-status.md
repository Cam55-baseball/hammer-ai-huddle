# AC6 — History game-row labels on phone

Overall: **FAIL — Date and Status labels exist in rendered text but are not visible on the phone.** No application source was changed.

## Method and checks

- PASS — reused the AC5 Playwright method from `/tmp/browser/a4/proof.py`, with headless Chromium at 390 × 844 and the requested TEST player; auth service identity verified before data changes.
- PASS — snapshotted all four player-scoped History sources before creation: `gp_games`, `gp_reports`, `performance_sessions`, `monthly_reports`; each baseline count was 0 (`before-snapshot.json`).
- PASS — entered two draft games through Games → New game → Opponent → Open game sheet, with opponents `TEST AC6 History 1` and `TEST AC6 History 2`; no direct inserts or mocked responses.
- PASS — `/history` → Games displays both persisted rows and the badge **2 saved**.
- PASS — each row visibly starts with **Opponent:**.
- FAIL — each row must visibly show **Date:** and **Status:**. Both labels and values exist in DOM text, but both screenshots show only a single truncated opponent line; date/status are clipped away. DOM text alone is not a visual pass.
- PASS — both saved game types are unset; no **Type:** label and no empty separator occur in either row's rendered text. Nonempty Type behavior was not exercised because the AC5 entry method leaves type unset.
- PASS — separate fresh Chromium context restored only the TEST session, navigated to History, reloaded, expanded Games and read back both saved rows and **2 saved**; the same visual labeling failure persists.
- PASS — both evidence screenshots are viewport-cropped 390 × 844 and were visually reviewed: `history-populated.png`, `history-fresh-reload.png`; `history-before.png` records the entry screen before changes.
- PASS — zero page errors in both proof contexts; zero HTTP error responses observed in the primary context.
- PASS — no horizontal overflow in either context: viewport, document scroll width and body scroll width all 390 pixels.

## Retry disclosure

The initial exact-text wait for the opponent timed out because the rendered opponent element also contains the date/status text. Its two created rows were backed up and deleted in the script's finally block, with zero-row readback and all baseline counts restored. The proof was repeated using row text to capture the actual UI rather than assuming the expected markup. This completed attempt created two replacement games through the same app flow. No source changes were made.

## Cleanup

- Initial attempt: created 2, backed up 2, deleted exactly 2, exact-ID readback 0.
- Completed proof: created 2, backed up 2, deleted exactly 2, exact-ID readback 0.
- Total across both attempts: **created 4 / backed up 4 / deleted 4 / remaining 0**.
- Backups were written before deletion; `test-rows-backup.json` contains full rows for both attempts.
- Every delete was scoped by the verified TEST user ID AND captured created row IDs, with TEST opponent markers checked before deletion.
- Final counts match the zero baseline for all four History source tables: games 0, reports 0, practices 0, recaps 0.
- No pre-existing rows deleted. No migrations, deployment, publishing, iOS changes, or application code edits.

`diagnostics.json` records completed-proof DOM checks, widths, errors and cleanup counts; session credentials and backend addresses remain outside the repository.
