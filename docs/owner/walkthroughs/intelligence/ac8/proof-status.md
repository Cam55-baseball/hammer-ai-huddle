# AC8 — A4 team post-game report

Overall: **FAIL — no separate team post-game report screen exists yet.** No application code was changed.

- PASS — TEST player entered 1 TEST game ("TEST AC8 Team") through the app: 2 at-bats, 2 pitches, 1 defensive play, 1 baserunning event.
- PASS — the player's own post-game report counted every entered event correctly at 390×844 (`player-individual-report.png`). No page errors, no sideways scrolling.
- FAIL — the coach opening that game's report saw "Building the report…", and after the game was removed, "Couldn't build this report: Game not found" (`coach-report.png`, `coach-fresh-reload.png`). There's no team/coach report route.
- FAIL (engine honesty, needs a fix) — the player report filled in values that were never entered: pitch type "unknown" counted as 100% usage, a baserunning attempt with no result shown as "no / 0 of 1 successful", and a "Train next" first-pitch-strike suggestion based on only 2 pitches with no "early read" label.
- PASS — cleanup: 8 TEST rows (1 game, 2 at-bats, 2 pitches, 1 defense, 1 baserunning) plus 1 extra TEST game from an interrupted attempt, all backed up and deleted; zero remaining. No connection requests were created.
