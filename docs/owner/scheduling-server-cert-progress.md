# Scheduling server certification (D/E/H) — progress

## Run 1 — Oct 29 2026, 20:46–21:00 UTC
- Named create-test-athlete redeploy (owner approval): 5 new TEST personas (certhsp, certsb5, certsbp, certsb2, certcsb2) plus TEST-only `prepare` (fills only missing starting inputs, then calls the real `start_hammers_today` with the persona's own session), `skip_seed` (dated games never shift) and pass-through of `compose_sport_day` / `change_reason`.
- All 8 personas: start gate `missing: []`, Start succeeded on its merits. Games seeded by the helper into the app's calendar (in-season weeks 3–4): HS 4–5/wk, college softball 8 over two weeks; existing demo16ss/demo2way/demomlb keep their seeded schedules (in-season now, so their off-season week is not inside the window).
- DB checks: memory 54→68→67%, connections 23–26/60, no new DiskIO alert (last 17:15 UTC).
- Unit 1 (certhsp, Oct 30–Nov 5): first pass built physical-only days (no sport cards; compose was not requested). Rebuilt via the app's change path with full composition: Oct 30, Nov 1, Nov 2 saved; Oct 31, Nov 3, Nov 4, Nov 5 refused `composed_day_validation_failed`.
- **Failure found:** on recovery-only days the conditioning check still used the off-day session (needs aerobic base) although only an easy flush remained, so the day failed and the player got the reduced safe session. **Fix staged** (`certifiedConditioningTemplate`, 3 tests pass): such a day is certified as a Recovery Flush (stricter, no hard work). **Not live**: needs a named `wk-generate-daily` redeploy.
- Other observations to verify before certifying: Strength shows "bodyweight (bands)" despite saved barbell gear; a "Game IQ" block appears on the saved day; four of seven days were recovery-only for a fresh pitcher.
- **Certified saved dates: 0 / 224.**
