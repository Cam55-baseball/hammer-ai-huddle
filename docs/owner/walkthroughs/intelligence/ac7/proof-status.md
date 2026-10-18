# AC7 — History game-row labels on phone

Overall: **PASS** — both rows visibly show the requested two-line labels in the initial and fresh-context screenshots.

## Method and checks

- PASS — reused `/tmp/browser/ac6/proof.py` and the AC6 proof-status method; Playwright Python, headless Chromium, 390 × 844 viewport, device scale 1. Scripts are in `/tmp/browser/ac7/`.
- PASS — authenticated as requested TEST player `db9cc8ef-5b00-48f1-b113-24b7790e4660`; identity verified before creation. The environment session failed the identity preflight, so the requested `lovable auth-session` fallback was used; no data changes occurred in that preflight.
- PASS — snapshotted all four player-scoped History sources before creation in `before-snapshot.json`: `gp_games`, `gp_reports`, `performance_sessions`, `monthly_reports`; baseline counts all 0.
- PASS — entered exactly two games through Games → New game → Opponent → Open game sheet, named `TEST AC7 History 1` and `TEST AC7 History 2`; no direct inserts or mocked responses.
- PASS — opened `/history` → Games and visually reviewed `history-populated.png`: each row shows **Opponent:** and its full opponent on line 1, with **Date: 2026-10-18 · Status: Draft** visibly on line 2. Both rows are fully within the viewport.
- PASS — both saved games have null game type (verified in backed-up rows); neither screenshot shows **Type:** or an empty separator. The single separator is between the populated Date and Status values.
- PASS — **2 saved** badge is visible in both screenshots.
- PASS — created a separate fresh browser context, restored only the TEST session, navigated to History, reloaded, and opened Games; both persisted rows and the badge read back successfully. Visually reviewed `history-fresh-reload.png` confirms the same two-line layout.
- PASS — both evidence screenshots are 390 × 844 viewport captures, not full-page captures. `history-before.png` records the Games entry screen before creation.
- PASS — zero page errors and zero HTTP error responses observed across both proof contexts.
- PASS — no horizontal overflow: viewport/document/body widths are all 390 in both contexts.

## Cleanup

- PASS — created **2**, backed up **2**, deleted exactly **2**, exact-ID readback **0**.
- PASS — full created rows saved to `test-rows-backup.json` before deletion; deletion constrained by verified TEST user ID AND captured created row IDs, with TEST opponent markers checked before deletion.
- PASS — final counts match baseline: `gp_games` 0, `gp_reports` 0, `performance_sessions` 0, `monthly_reports` 0.
- No pre-existing rows deleted. No application source changes, migrations, deployments, publishing, cron, or iOS changes.

`diagnostics.json` contains row text, badge readback, widths, error lists, and cleanup counts. Session credentials and backend addresses remain outside the repository.
