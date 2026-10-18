# AB2 — Step 5, October 18

Ready to publish: **no**.

## Delivered
- Pitch, defense and baserun events now have server-attributed source labels. Authenticated self logging distinguishes parent-run accounts from players; imports and estimates remain unverified declarations. Old events remain “Source not recorded.” Updates cannot rewrite the original source. No video/coach-verification label can be claimed on these events without a dedicated evidence path.
- Pitch rows and at-bat pitch rows, defensive plays and baserun events display the saved source, not the viewer's role.
- Pitcher entry opens as pitcher. Location, intended location, inning, pitch number, count and handedness are no longer silently preselected. Blank optional facts save as null. Numeric blanks/invalid strings cannot become zero measurements. The form stays open after save failures and disables repeat submits while saving.
- The existing quick at-bat bar now offers the existing field-direction picker. A single to left field saves `exit_direction=LF`; missing directions remain null, and walks/strikeouts cannot acquire a ball-in-play direction.
- Deterministic pitch imports explicitly retain the Imported source. Existing at-bat import attribution and structured pitcher contact/intent details still need completion; those pitcher extras currently remain in notes and are not claimed as report-ready structured fields.

## Proof
As the kept college test player on 390×844: opened Games → Game day Open → Pitching → New pitch → Save pitch. Saved source read back as player_entered. Location, inning, pitch number, counts, speed and handedness all read back as null. Attempting to rewrite source as estimated left the original player_entered source intact. The saved event badge was captured (`player-pitch.png`), with no horizontal overflow.

The same player tapped left field in the quick at-bat bar, then Single. The screen showed “Single to left field,” “Ball went to: Left field” and the Player-entered badge. Read-back confirmed LF (`player-ball-in-play.png`). These are synthetic **test entries**, not real game evidence or cohort data.

The parent-run account's Games page stopped at the existing updated legal/signature gate (`parent-start.png`). It was not bypassed or silently accepted. Parent phone logging is therefore unverified in AB2. Coach's two logging paths and all five populated cohorts remain unverified; earlier video-tag proof remains valid.

## Live / checks / cleanup
Owner-authorized additive migration `0076_game_event_source_provenance` applied to the shared backend; no existing rows relabeled and no access policies changed. Frontend changes are in preview, not published. No function redeploy, cron or iOS changes.

Full suite before the final numeric hardening/import-line update: **377 files / 2,973 tests passed**. Final focused pitch-entry/import tests: **2 files / 9 tests passed**, including the additional invalid-number test. Build OK after final edits. Full page audit is not complete.

Every created test game, pitch and at-bat was deleted by exact game ID in cleanup, including failed proof attempts. Final lookup: zero AB2 test games. Kept test-account passwords privately refreshed under existing authorization. No real game data, profiles, consents or subscriptions changed.

## Next unfinished work
Finish step 5 parent/teen/coach coverage, imports and report-ready structured ball/contact details before claiming completion. Then step 6 Game IQ/team reports/matchups, step 7 Coaching Console, step 8 privacy-safe population learning, each with the required real populated cohorts. Parent/pitcher/softball legal gates remain uncompleted; hitter/pitcher proof cohorts lack the required 10+ games / 5+ reports. No fabricated games or reports will be counted as real proof.