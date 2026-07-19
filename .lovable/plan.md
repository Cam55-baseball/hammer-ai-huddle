# Onboarding — Elite E2E Fixes

Three concrete gaps in `src/pages/AthleteOnboarding.tsx` and its child steps. All frontend/presentation work — no schema changes.

## 1. Throwing hand: add "Both" option

The Profile step currently doesn't collect throwing hand at all, and `ThrowingHandSelector` only exposes L/R. Ambidextrous throwers have no way to declare that.

- Extend `src/components/splits/ThrowingHandSelector.tsx` to support values `L | R | S` (S = switch/both).
- In the Profile step of `AthleteOnboarding.tsx`, add a "Which hand do you throw with?" question with **Left / Right / Both** options.
- On save, write to `profiles.throwing_hand` and, when Both is picked, also set `is_ambidextrous_thrower = true` + `primary_throwing_hand` via the existing `useSwitchHitterProfile` hook (both fields already exist in the schema).
- Reuse the same pattern already used elsewhere in the app so downstream side-context, splits, and drill logic pick it up automatically.

## 2. Real Back button — end to end

`goBack` exists but several steps render it inconsistently and the shell has no persistent back affordance:

- Add a persistent **Back** control in `AthleteOnboardingShell.tsx` header (left of Save & exit) that calls the same handler, hidden only on step 0 and Done.
- Audit every step (`Welcome`, `Profile`, `Rank goals`, `Schedule`, `Confirm`, `Injury`, `Notifications`, `Review`) to guarantee a working Back that preserves in-step input (goals, day type, injury draft) via the draft store before navigating.
- Wire the stepper chips at the top so clicking a completed step navigates back to it.

## 3. Save & Exit that actually resumes

Today `writeDraftSlot` fires on exit but resume only triggers when URL has `?resume=1`. Users who click Save & Exit and later reopen `/onboarding/athlete` land back on step 0.

- On mount, if a draft exists for `onboarding-step` and onboarding is not yet complete, auto-resume to the saved step + dayType (no URL flag required).
- Add a subtle "Resuming from step N — start over" banner so users can opt out.
- Persist per-step form state (Profile answers, selected dayType, injury intake progress, notification prefs toggled) to their own draft slots on every change, not just on exit — so refresh/tab-close never loses input.
- Clear the `onboarding-step` slot on true completion (Done step) via `clearDraftSlot`.

## Technical notes

- Files touched:
  - `src/pages/AthleteOnboarding.tsx` — Profile step form, auto-resume, per-field draft writes, clear-on-complete.
  - `src/components/onboarding/AthleteOnboardingShell.tsx` — header Back button, clickable completed stepper chips.
  - `src/components/splits/ThrowingHandSelector.tsx` — add `S` (Both) option.
  - `src/lib/onboarding/draftStore.ts` — add a `profile-answers` slot type.
- No database migration required; `profiles.throwing_hand` and switch-hitter fields already exist.
- No changes to canonical event emission, replay lineage, or Command Center gating.
