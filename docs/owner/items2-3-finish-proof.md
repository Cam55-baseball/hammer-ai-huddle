# Items 2 and 3 — October 29 finish attempt

## Status: both OPEN

No publish, migration, cron, iOS or safety-switch change. Only `wk-generate-daily` redeployed with the owner's named authorization; final submitted source SHA-256 `71c1e5f3dd28a6bbd5ac65114712b461b8ef72a7276ff0a18e706cb116fad454`. Frontend is preview-only.

## Item 2: actual owner --self
- Minted the requesting owner's `--self` session, opened real dashboard at 390×844, called the imported app `rebuildAfterChange` path (same authenticated day-lock requests used by Update Hammer).
- Rebuilt October 29–November 4 twice; final replies confirmed all seven physical-day requests. Reload/readback: 59 physical rows on seven dates, all final phases `os_q1` (the earlier saved week had `in_season`).
- Combined sport snapshot readback still contains only October 29. No six future skill snapshots were fabricated by copying today's plan. Today combines current physical rows with the component's skill composition; the seven-day helper cannot currently load all dated safety/evidence/overlay inputs for that composition.
- Owner has six days available, ankle/shoulder restrictions and no confirmed fielding gear; defense is awaiting input. Hitting, defense, baserunning, running conditioning and purchased bunting floors are NOT certified. Restrictions/gear were not erased or invented to force a pass.
- Owner screenshot `/tmp/browser/items23/owner_after_rebuild.png`; readback `/tmp/browser/items23/owner_readback.json`. No claim every saved day matches the training-block strip.

## Item 3: implemented and observed
- Shared `availability.ts` now limits the skill microcycle, its overflow/top-up, roadmap and server physical rest to the same declared training weekdays. Six remains Monday–Saturday; four uses Monday/Tuesday/Wednesday/Friday. No new dose, no Sunday training.
- Future-effective timeline saves can rebuild the seven-day window beginning on their future start date, rather than only today's window. Regression-tested, not future sport-snapshot proof.
- Schedule override save/remove/no-game actions now await the existing `announceChange` rebuild and shared schedule/coach invalidations, rather than two local cache invalidations and premature success messages.
- Failed/degraded build replies no longer count as full rebuild success or dispatch a successful-rebuilt event. Existing safe fallback remains available on training dates; rest fallback filters to explicit gentle-recovery identities and refuses a non-gentle empty fallback rather than prescribing training on Sunday/unavailable dates.
- Retained brand-new Item18 TEST player at 390×844: Update Hammer → own words → “I can train 4 days per week” → exact confirmation → Save → context readback 4 → reload. Observed removal of skill work on Thursday and saved rest flags on Saturday/Sunday. This first attempt exposed an existing full-generator fallback; its initial success message was therefore NOT full-plan proof.
- After fixing degraded-success handling/rest fallback, restored the TEST player's original six days through the same real UI. Readback 6; screen honestly reported “saved, but 7 days could not be rebuilt.” No safety bypass, no manufactured full plan.
- Future sport snapshots, alternate Schedule & What Changed/Tell Hammer completed UI journeys, and connected coach before/after UI refresh remain unproven. Coach's existing gated 15-second refresh is regression-tested only.

## Verification
Eight focused files: 71 tests passed (seven-file batch 70 + separately executed new rest fallback test 1). Includes actual-builder eight-week both-sport/phase/safety simulations, four-day overflow, six-day Sunday rest, future rebuild dates, degraded refusal, schedule overrides and gated coach refresh. Automatic preview build OK at 06:10:30 UTC.

Open work is functional/acceptance work, not human-only checks: complete reusable dated final sport composition with all owner/coach/analysis/mastery/bunting overlays and safety reads, save through the existing day-lock snapshot path, combined seven-day purchased-floor certification, full eligible TEST plan before/after and connected coach proof. No work runs after this report.