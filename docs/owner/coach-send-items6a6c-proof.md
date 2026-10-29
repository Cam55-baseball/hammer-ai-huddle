# Items 6a and 6c — October 29, 2026

## Changes
- My Players → Send activities no longer opens a coach-own-template-only list or creates legacy invitations. It lists existing Exercise Vault items, declared baseball/softball drills and coach saved exercise activities, searchable and category-filtered, with a scheduled day.
- Catalog sends retain identity, exact declared dose, measure and complete equipment groups; real template references only for saved templates. Server safety, connection, consent, day-lock and canonical logging paths remain unchanged.
- Dashboard header notification projects pending self-owned prescriptions. Player Coach workouts retains answered history; coach Sent workouts now reads canonical prescriptions/results instead of legacy invitations.
- Root cause of Save for later failure: canonical transaction stored action `save_for_later` rather than valid status `saved_for_later`. Applied targeted migration 0149; existing certification, locks and grants unchanged. No redeploy needed.

## Actual phone proof — Chromium 390×844
Owner-only create-test-athlete session_only used for existing democoach and connected democollege; no reseed, password reset, owner role impersonation, or subscription bypass.

1. democoach picks Demo — College Outfielder → Send activities → searched Crocodile breathing → scheduled October 29 → sent. Required missing-experience/check-in/workload warnings explicitly acknowledged as TEST. Exact prescription `79113813-3236-4775-beab-a58ab1125c57`.
2. Player saw notification, dated Today card with all three choices, and My Workouts → Coach workouts. Add alongside acknowledged same explicit warnings; canonical row `171cb80b-2557-4b58-903a-bae5b4fc7352` retained `wu_crocodile_breathing`.
3. Player opened coach card, entered TEST count 8, Save & Exit, reloaded: Done. democoach → My Workouts → Sent workouts: Added alongside, Done 1/1, Sets 1 · Reps 8. These are simulated TEST entries, not evidence of physical performance.
4. Second real send `0fcab0cd-be95-432b-900b-c561acdbb4b3` (90/90 breathing) reproduced Save for later HTTP409; after targeted fix exact action HTTP200 with inserted0, date retained. Saved shelf shown after reload. Use today instead then acknowledged warning → canonical status used_instead; player response shelf confirms both choices.
5. Third exact UI send `b78479c0-555d-44fc-8b6b-e44cb81636f0` supports authenticated regression: Save for later→saved_for_later, date unchanged, zero workout rows. Retained on saved shelf.

Screenshots/scripts/private session artifacts are under `/tmp/browser/coach-send/`; no secrets exported. Key images: catalog.png, player-notification.png, player-today.png, player-shelf.png, player-coach-work.png, player-logged.png, player-saved-final.png, player-responses-final.png, coach-response.png.

## Checks and boundaries
- 270 affected coach/catalog tests passed, plus authenticated live regression 1 passed; catalog sport regression added separately.
- Automatic preview build clean. Player receive flow recorded zero page errors.
- TEST rows retained on existing hidden TEST personas; no deletion, cron, iOS or publish. Only Save for later status correction is live; screens remain unpublished.
- Not a physical iPhone/WebKit proof. Built-in sport drills and Vault items keep existing safety refusals; 3D Belly Breathing was correctly refused for missing recovery_category, not silently certified.