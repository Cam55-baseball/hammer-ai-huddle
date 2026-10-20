# AK1 — Assessment Mode foundation proof

October 20, 2026. Preview at 390 × 844, headless Chromium, kept TEST college player using the owner-authorized create-test-athlete session path. No physical iPhone claim.

## Observed

- `start.png`: full-screen step 1, six-part progress, Back/Skip/Mark complete/Next and X. Back is correctly disabled on the first step.
- `step5.png`: TEST college subscription supplies hitting and throwing; both buttons appear together, not only the first unfinished analysis. The latest title is “Your first analyses”; this capture preceded its shortening.
- `embedded_analysis.png`: hitting analysis mounts inside Assessment Mode, camera controls plus existing upload input; URL stays `/assessment?sport=baseball` after removing the checkout timer race. No recording/upload submission was claimed by this run.
- `s2.png`: real S2 component embedded, its original 16-week lock retained. Intro mounted, not a completed 8-part cognition test.
- `sixweek.png`: canonical Vault performance entry embedded, with module selector and existing six-week lock. No measurement fabricated or entered in this run.
- `guard.png`: X returns to dashboard; guard shows 1 of 6 done and Continue. Start was disabled before assessment completion.
- `unlocked.png`: explicit skips of every remaining step persist completion; guard disappears and Start Hammers Today Plan becomes enabled. Start was **not clicked**: generator and saved Today readback still need proof.

## Cleanup and regression checks

Before navigation writes, saved the exact TEST assessment progress snapshot privately under `/tmp/browser/assessment/progress_backup.json`. Restored progress, current step, presentation timestamp, completion, season and movement fields afterward; database readback shows empty step_progress, current_step=1, mode_opened_at=null, completed_at=null. No games, clips, test measurements, legal consent or subscriptions were created/deleted in this proof.

52 focused checks passed in seven files: assessment order/skips, once-only entry, tier entitlements, purchase gates, calendar-practice reminder rules (including eight-week Tuesday recurrence), and live-switch guards. Latest preview build OK. The existing preview service-worker MIME warning was observed; no page exceptions occurred. It was not characterized as an assessment error.

## Not yet proven / implemented

All six program/sport phone combinations; automatic popup after an actual $0 checkout; completed embedded S2 and saved owner-clip analysis; profile/body/goals/equipment completeness; sharing of new season answers into The General/onlookers; coach/org shared full mode; Start → saved Today generation; practice phone completion; full eight-week player-type prompt matrix; new guarded prompt adapters and Discipline/learning projections. These are open, not PASS.

## Applied vs pending

Additive assessment progress migration is live on the shared backend; no data was removed. `plan_prompts_v2` was added OFF and read back OFF/buildable=false. Frontend screens and calendar reminder changes are preview-only. No function redeploy, publish, cron or iOS change.