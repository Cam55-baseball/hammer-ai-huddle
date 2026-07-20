## Root cause

The Both / Back / Save‑&‑resume work from the last turn **is in the code and correct** — but your account has `hasCompletedOnboarding = true`, so `src/pages/AthleteOnboarding.tsx` fires this effect on mount:

```
if (hasCompletedOnboarding && !isReviewing && step < STEP_NOTIFICATIONS)
  navigate("/command", { replace: true });
```

That kicks completed users straight to `/command` before Welcome/Profile ever render. That is why every fix looks missing — you literally never see those screens.

## Fix

Frontend / presentation only. No schema changes.

### 1. Give completed users a real entry point
`src/pages/AthleteOnboarding.tsx`
- Replace the silent auto‑redirect for completed users with a **first‑screen "Welcome back" panel** (rendered when `hasCompletedOnboarding && step === 0` and no `?edit`/`?step=review`/`?redo=1`) offering three actions:
  - **Review answers** → `setStep(STEP_REVIEW)`
  - **Redo onboarding** → clears the `onboarding-step` draft and starts at Welcome (adds `?redo=1`)
  - **Go to Command Center** → `navigate("/command")`
- Remove the automatic `navigate("/command")` so the user is never bounced without consent. Deep‑links (`?edit=…`, `?step=review`, `?redo=1`) bypass the panel exactly as today.

### 2. Make the throwing‑hand answer visible & editable from Review
`src/components/onboarding/steps/ReviewAnswersStep.tsx`
- Add a **Profile → Throwing hand** row that reads `profiles.throwing_hand` (mapping `B` → "Both") and links via existing `onEdit("profile")` deep‑link, which already routes to the Profile step and returns to Review on save.

### 3. Guarantee Back + Save‑&‑Exit continue to work on the re‑entered flow
Already implemented, but re-verify against a completed account after fix 1:
- Header Back button in `AthleteOnboardingShell.tsx` shows on steps 1..N‑1.
- Stepper chips are clickable for completed steps.
- `writeDraftSlot("onboarding-step", {stepIndex, dayType})` fires on every step change; auto‑resume runs without `?resume=1`; `clearDraftSlot` runs on Done and on "Start over" / "Redo onboarding".

### 4. Minor polish
- On `?redo=1`, also clear `profile-answers` so the throwing‑hand pick truly restarts.
- Replace the small "Resuming from step N" banner text with the current step's label + a "Start over" button (already present) — no additional plumbing needed.

## Files touched
- `src/pages/AthleteOnboarding.tsx` — welcome‑back panel, drop silent redirect, honor `?redo=1`.
- `src/components/onboarding/steps/ReviewAnswersStep.tsx` — surface throwing‑hand row with edit link.

## Out of scope
- No changes to `draftStore.ts`, `ThrowingHandSelector.tsx`, or `AthleteOnboardingShell.tsx` — those pieces are already correct; the fix above is what actually lets you see them.
