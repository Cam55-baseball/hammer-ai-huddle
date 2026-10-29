# Scheduling server certification (D/E/H) — progress

## Run 1 — Oct 29 2026, 20:46–21:00 UTC
- Named create-test-athlete redeploy (owner approval): 5 new TEST personas (certhsp, certsb5, certsbp, certsb2, certcsb2) plus TEST-only `prepare` (fills only missing starting inputs, then calls the real `start_hammers_today` with the persona's own session), `skip_seed` (dated games never shift) and pass-through of `compose_sport_day` / `change_reason`.
- All 8 personas: start gate `missing: []`, Start succeeded on its merits. Games seeded by the helper into the app's calendar (in-season weeks 3–4): HS 4–5/wk, college softball 8 over two weeks; existing demo16ss/demo2way/demomlb keep their seeded schedules (in-season now, so their off-season week is not inside the window).
- DB checks: memory 54→68→67%, connections 23–26/60, no new DiskIO alert (last 17:15 UTC).
- Unit 1 (certhsp, Oct 30–Nov 5): first pass built physical-only days (no sport cards; compose was not requested). Rebuilt via the app's change path with full composition: Oct 30, Nov 1, Nov 2 saved; Oct 31, Nov 3, Nov 4, Nov 5 refused `composed_day_validation_failed`.
- **Failure found:** on recovery-only days the conditioning check still used the off-day session (needs aerobic base) although only an easy flush remained, so the day failed and the player got the reduced safe session. **Fix staged** (`certifiedConditioningTemplate`, 3 tests pass): such a day is certified as a Recovery Flush (stricter, no hard work). **Not live**: needs a named `wk-generate-daily` redeploy.
- Other observations to verify before certifying: Strength shows "bodyweight (bands)" despite saved barbell gear; a "Game IQ" block appears on the saved day; four of seven days were recovery-only for a fresh pitcher.
- **Certified saved dates: 0 / 224.**

## Run 2 — Oct 29 2026, 21:02 UTC
- Recovery Flush fix (3 tests pass) made live with the approved `wk-generate-daily` redeploy (source sha256 2d4e5718…f1ec).
- No units built: the persona runner from run 1 was lost when the workspace reset; it must be rebuilt before unit 1 is redone (Oct 31, Nov 3–5 for certhsp).
- **Certified saved dates: 0 / 224.**

## Run 3 — Oct 29 2026, 21:04–21:20 UTC
- Runner rebuilt (/tmp/cert/unit.py: one date per call, waits for each reply, 60 s + load check between units).
- **Failure fixed:** a "go easier" day whose hard sprint became an easy flush (and the pitcher drill wasn't available) was still checked as Off-Day Conditioning, so Nov 5 failed. Such flush-only days are now checked as a Recovery Flush (no hard work allowed). 5 tests pass; approved `wk-generate-daily` redeploy live (sha256 e5adb908…f07d).
- Unit 1 (certhsp Oct 30–Nov 5): 7/7 saved and validated, readback confirmed. Unit 2 (certhsp Nov 6–12): 7/7 saved and validated.
- Load: memory 64–67%, connections 24–25/60, no new DiskIO alert after 17:15 UTC.
- **Certified saved dates: 14 / 224.** Next: certhsp Nov 13–19.

## Run 4 — Oct 29 2026, 21:15 UTC
- Units 3–4 (certhsp Nov 13–26): 14/14 saved and validated; load steady (memory 69%, 24/60 connections, no new DiskIO alert).
- Built and saved: 28 / 224 dates. These dates are NOT yet floor-certified: the saved days carry a Game IQ card, bands-only strength and 3 off-season bullpens (see scheduling-certification.md).

## Run 5 — Oct 29 2026, 21:28–21:45 UTC (batch 1 of remaining personas)
- Fixed: unreleased Game IQ was saved into every player day → removed from player plans while the release switch is off (test `dailyPlan.noGameIq.test.ts`; old matrix updated).
- Fixed: a saved "bands" token outranked saved barbell/rack/dumbbells, so Strength fell to "bodyweight (bands)" → loadable gear now wins; bands alone stays bands; unknown stays unknown (test `decisionFilters.loadGear.test.ts`).
- 1,143 plan/coach/Today tests pass; bundle parity passes; approved `wk-generate-daily` redeploy live (sha256 8d66f495…8538).
- certsb5 (softball 5Tool) Oct 30–Nov 12: 14/14 saved. Checked from saved data: Sunday rest only, no Game IQ, no pitching card, bunting on every training day, off-season strength, 2+ running conditioning in the Oct 26–31 and Nov 2–7 weeks. Not checked from saved data: Primer numbers, Mind item (shown on screen, not saved in the day).
- Still open: in-season game cards (bug 4) and bullpen frequency (bug 3); certhsp's 28 days must be rebuilt after those fixes.
- Load: memory 53%, connections 23/60, no new DiskIO alert.

## Run 6 — Oct 29 2026, 21:46–22:30 UTC (batch 2)
- **Fixed (bug 4):** games entered in the app's calendar were not counted as game days (only Game Plan games and Tell Hammers were), so game days were built as ordinary "taper" days. Shared rule `_shared/schedule/isGameDay.ts` now counts all three; ignored/cancelled games never count (4 tests).
- **Fixed:** a game day now carries its own loggable card "Game day — play and log your game" (opens Games, adds no training dose); light pre-game defense primer, strength/speed off and post-game recovery are unchanged (1 test).
- **Fixed:** bunting fell to 1 session in game weeks because in-season full-hitting days were the game days. Bunting now skips game days and, if needed, fills the 2+ minimum from light-hitting days; attempts still come out of that day's swings (3 tests).
- 769 plan tests pass; server builder bundle regenerated; approved `wk-generate-daily` redeploys live (latest sha256 c17a2965…e6cf).
- certsb5 Nov 13–19 rebuilt and Nov 20–26 built: game cards on all 5 calendar games (Nov 13, 16, 20, 23, 25); Sunday rest only; no Game IQ; no pitching; Nov 16–22 week: bunting Tue/Wed, conditioning Tue/Wed/Sat. Nov 23–29 week continues past the window (Nov 27–29 not in scope).
- Load: memory 70%, connections 25/60, disk 45%, no new DiskIO alert after 17:15 UTC.
- **Saved and verified: 28 / 224 (certsb5 complete).** certhsp's 28 saved days still await the bullpen-frequency fix (bug 3) and a rebuild. Next: certsbp Oct 30–Nov 5.

## Run 7 — Oct 29 2026, 22:06–22:45 UTC (batch 3)
- **Fixed (bug 3):** a fixed Saturday bullpen was added on top of the existing pitching week, giving 3 pens. Removed; the existing pitching week alone sets pens (2/week: Mon outing-equivalent + Thu), the day after pitching stays a flush, Sunday rest (3 tests, `src/test/schedule/bullpenFrequency.test.ts`). 787 plan tests pass; bundle regenerated; approved `wk-generate-daily` redeploy live (sha256 be3e8c60…9e9f).
- Rebuilt certhsp Oct 30–Nov 12 and built certsbp Oct 30–Nov 12: pitching card every day, 2 bullpens/week, no hitting/bunting/baserunning, no Game IQ, Sunday rest.
- **Failure found, not fixed:** both pitchers get only ONE real running-conditioning day in the Nov 2–7 week (most days are easy flush only), below the 2+ floor. certsbp Nov 9–10 were refused by the safety check for the same reason (flush-only day judged as Off-Day Conditioning; that check is correct and was left in place). Next: trace why pitcher conditioning collapses to flush-only on normal days.
- Load: memory 65%, connections 24/60, no new DiskIO alert after 17:15 UTC.
- **Saved and verified: 28 / 224** (certsb5). Saved but blocked by the conditioning floor: certhsp 28 (14 rebuilt), certsbp 12.

## Run 8 — Oct 29 2026, 22:20–23:10 UTC (batch 4)
- Fixed and live (approved `wk-generate-daily` redeploys, latest sha256 37441336…d98): load-spike trim keeps the required easy-base-run conditioning row; no lifting on any game day (dense weeks too); a game day may have no physical rows.
- Built every remaining unit; refused days rebuilt after the fixes.
- **Saved and verified: 224 / 224.** Sheet rewritten from saved data: docs/owner/scheduling-certification.md.
- Open: 0 running sessions in 4–5-game weeks (owner decision); pitchers mostly easy flush; demo personas have no off-season week in the window.
