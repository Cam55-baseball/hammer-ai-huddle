# AB6 — step 5 logging honesty and teen proof

Ready to publish: NO.

## Completed
- Fixed defense/running forms that previously preselected invented innings, positions, hands, bases, outcomes and shifts. Required position/event is now a deliberate choice; optional facts start unknown. Outcomes offer Not entered / Yes / No, and shared payload normalization preserves nulls and explicit false values.
- A real signed-in kept teen account created a game through the phone form, selected SS, saved a defense entry, then selected an advance event and saved a running entry. Fresh navigation and reload retained `Logged by: Player-entered`. Database read-back confirmed all untouched facts null. Required-choice save gates, zero horizontal overflow, and zero page errors passed at 390×844.
- Screens show explicit `Inning: Not entered`, labeled position and event, and no invented success icon.
- These are explicitly synthetic fixtures for behavior proof, NOT real games or populated-cohort evidence. Exact game and defense/running rows were deleted and each zero count verified. No agreement, signature, sharing flag, paid access or role was changed.
- Full suite: 381 files / 2,997 tests passed. Final focused rerun after display-label changes: 18/18 passed. Latest preview build OK.

## Blocked proof, not passed
- Parent-run, pitcher and softball kept accounts stop at updated agreements. No legal or health consent was accepted on somebody else's behalf; no gate was bypassed. Parent signature flow and positive parent logging remain unverified.
- Both coach entry paths (`/coach-dashboard`, `/coach/lineup`) show the Hammers Coach plan gate on a phone without overflow. No paid-access override or Stripe mutation was made. Successful coach logging in both modes still needs a working test subscription.
- New-player, hitter/teen and two-way accounts can open Games. All five kept player cohorts have zero non-deleted saved games and zero game reports. Consequently the required real 10+ game hitter and 5+ report pitcher populations cannot be claimed. No fake population data was added.
- Initial test navigation used nonexistent `/coach` and showed 404; corrected to the actual two coach routes before recording coach gate evidence. Initial proof reloaded `/games` without its game link; final proof explicitly reopened the saved game link and reloaded successfully. Neither was an application regression claim.

## Next
Finish consent-gated parent and both coach successful logging proof, then obtain genuine populated-cohort evidence; steps 6–8 remain open in order. Owner nightly schedule SQL remains unapplied. No publishing, backend deployment, migration, cron or iOS changes in AB6; app edits are preview-only.

Screenshots: teen-defense.png, teen-baserun-reload.png, parent-run-entry.png, coach-single-player-gate.png, coach-lineup-gate.png.