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
