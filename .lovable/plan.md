# Unified sign-up and onboarding

## Outcome
- Clicking **Sign Up** opens the first click-through screen immediately; the long create-account sheet disappears from the new-user journey.
- Keep the owner’s proposed order unchanged. Longer named sections may use short sub-screens so every phone screen contains at most two fields and never requires page scrolling.
- Preserve Back, Next, per-screen validation, visible progress, and resume across app closes.

## Account creation decision
- Collect email and password first, but do not create the account immediately.
- Create it after the user completes **Sport, position, bats and throws**. At that point they have supplied the minimum meaningful athlete identity, reducing empty abandoned accounts while allowing all later health, body, equipment, and goal progress to save under their account.
- Before account creation, keep the draft on that device. Immediately after creation, attach and persist the draft to the signed-in account, then continue seamlessly.
- Keep terms/privacy acceptance in the account checkpoint without adding a separate long form. Preserve the current age check and guardian branch exactly: do not lower or remove protection, and do not add an under-13 flow, consent table, or new gate. Keep DOB in its current role within a short sub-screen and report the existing behavior.

## Email confirmation
- Use the current auth setting when it returns an active session and continue without interruption.
- If confirmation is required and no session is returned, show an in-flow confirmation screen, retain the full local draft, and resume the same step after the confirmation callback hydrates the session. The user will not be sent back to the old form or lose progress.

## Build
1. Turn sign-up mode on the auth page into the unified onboarding entry while leaving sign-in and password reset intact.
2. Consolidate existing profile and athlete-onboarding fields into one ordered flow: email; password; name/photo; sport/position/bats/throws; height/weight/graduation year; state/team/level; optional measurements; equipment; injuries; sleep/water; mental/career goals; review/Finish. Split dense groups into short sub-screens without changing their order or inventing fields.
3. Reuse existing validation and persistence. Save pre-account state locally, then migrate it to the existing account-scoped draft store after account creation.
4. Keep the exact Finish handoff: explanation line → one-time system permission request → dashboard → eligible new-account demo tour. Decline/errors continue normally; existing users remain unchanged.
5. Match the existing Hammers foil, glass, motion, controls, and typography; use a focused single-question composition, stable bottom navigation, compact progress, and reduced-motion support.
6. Verify the full path on a phone viewport, including close/resume, validation, account checkpoint, Finish handoff, no vertical overflow, and screenshots from at least four representative steps.

## Score lock-down verification
- First inspect the existing authorized migration and report its exact effect plus every reader of `efficiency_score` and `ai_analysis`. Do not rerun an already-applied migration.
- Verify denial with a real regular-user token and successful Report Card rendering with the owner session. Audit service-role responses and daily-plan weaker-side parity.
- Make local code-only leak fixes where required. Do not publish, deploy, redeploy, or run any unrelated migration; report any backend change still requiring separate owner authorization.

## Boundaries
- No changes to legal text, child signup, consent tables, iOS files, or Capacitor configuration.
- No publish, deployment, redeployment, or migration beyond the already named score lock-down authorization.
