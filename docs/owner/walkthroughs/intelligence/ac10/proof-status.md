# AC10 phone report re-proof — PASS

Viewport: 390 × 844, headless Chromium. Reused AC8 player workflow; coach skipped.

- PASS — Player-only app entry: one TEST AC10 Report game, two plate appearances (single and walk), two pitches with pitch type untouched, one defensive play, one steal with result untouched.
- PASS — Pitch table visually shows “Not entered”, not “unknown”, with count 2.
- PASS — Base-running summary shows “Not entered” / “result not entered”; steal row shows “Not entered”, not 0/1.
- PASS — First-pitch strike visually shows “Not entered” with “no 0-0 counts entered”.
- PASS — Train next contains no “First-pitch strike rate” suggestion.
- PASS — Counts match: 2 plate appearances, 2 pitches, 1 defensive chance, 1 steal row. The batting line is correctly 1-for-1 plus 1 BB.
- PASS — Fresh isolated player context plus reload preserves all report content (only generated timestamp changes); both screenshots visually reviewed.
- PASS — No page errors in either context (0 captured).
- PASS — No horizontal overflow in either context: document width 390px / viewport 390px.
- PASS — Pre-change snapshot and exact-row backup completed before deletion; deletion scoped by player and exact created IDs; zero remaining rows on readback.

## Evidence

- `player-individual-report.png`
- `player-fresh-reload.png`
- `defense-source.png`
- `running-source.png`

## Cleanup counts

| Table | Backed up | Deleted | Remaining |
|---|---:|---:|---:|
| gp_games | 1 | 1 | 0 |
| gp_at_bats | 2 | 2 | 0 |
| gp_pitches | 2 | 2 | 0 |
| gp_defense_plays | 1 | 1 | 0 |
| gp_baserun_events | 1 | 1 | 0 |
| gp_reports | 0 | 0 | 0 |

The report rendered on demand: no gp_reports row was created, so none required deletion. All seven created rows were backed up and deleted. Private pre-change snapshot and row backup: `/tmp/browser/ac10/before.json` and `/tmp/browser/ac10/created-rows-backup.json`. No application source changes.
