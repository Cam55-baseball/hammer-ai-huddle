## Problem

Onboarding today hides the header **Back** button on step 0 and the final Done step, and the stepper chips are only clickable for steps behind the current one. On a revisit (Review answers, deep-link edits, or Redo) users can't freely move back to earlier questions or jump forward again to the step they came from.

## Fix — presentation only

### 1. `src/components/onboarding/AthleteOnboardingShell.tsx`
- Show the header **Back** button whenever `onBack` is provided and `stepIndex > 0` (drop the `stepIndex < steps.length - 1` clamp so Done/Review also show it).
- Add an optional `allowForwardJump?: boolean` prop. When true, stepper chips are clickable for **every** step (not just completed ones), so revisiting users can bounce between Profile ↔ Goals ↔ Schedule ↔ Review at will.
- Keep the visual "done / active / upcoming" chip states unchanged.

### 2. `src/pages/AthleteOnboarding.tsx`
- Pass `onBack={goBack}` whenever `step > 0` (remove the `step < STEP_DONE` guard) so Back also works from the Done screen back into Review.
- Pass `allowForwardJump` to the shell when the user is revisiting — i.e. `hasCompletedOnboarding` **or** an `?edit=…` / `?step=review` deep-link is active — so returning users can jump forward as well as back. First-time linear onboarding keeps today's "completed-only" chip behavior.
- Ensure `goBack`'s `editReturnTo` shortcut still wins (already implemented) so a Back press from an edit target returns to Review in a single tap.
- Every embedded step already exposes an in-card Back (`ProfileStep`, `CategoryGoalsStep`, `ScheduleStep`, `InjuryIntakeStep`, `NotificationsStep`) — no changes needed there; the shell Back is the always-visible fallback.

### 3. Verify (no code changes expected)
- Manual walk-through on a completed account: Welcome-back → Review → Edit Profile → header Back returns to Review; Redo → header Back available from step 1 onward; stepper chip on "Goals" is clickable from "Schedule" both forward and backward.

## Files touched
- `src/components/onboarding/AthleteOnboardingShell.tsx`
- `src/pages/AthleteOnboarding.tsx`

## Out of scope
- No draft-store, schema, or step-content changes. Persistence on every step change (added last turn) already covers back/forward navigation safely.
