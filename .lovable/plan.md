Plan: Check-in cards on Hammers Today plan

1. Goal
Expose the existing Vault Focus Quiz check-ins (morning, pre_lift, night) as three discrete, check-offable cards inside the Hammers Today plan. Keep them in chronological order of the day and open the existing quiz dialog when the user taps the action.

2. Current state (verified)
- `VaultFocusQuizDialog` exists and supports `quizType: 'morning' | 'pre_lift' | 'night'`; it requires `onSubmit` (the `saveFocusQuiz` function from `useVault`).
- `useVault` fetches all vault data and stores `todaysQuizzes` keyed to `today` (local timezone). Its `saveFocusQuiz` saves to `today`.
- `HammerDailyPlan.tsx` is wrapped in `HammersTodayProvider` without an explicit `planDate`, so the plan is rendered for today.
- The existing card flow inside `HammerDailyPlanBody` is: warmup blocks → `WarmupCrossoverAddons` → `WkSpeedCard` → `WkBatSpeedCard` → `WkLiftsCard` → other blocks → `WkConditioningCard`.

3. What we will build

3.1 Lightweight quiz fetch hook
Create a focused hook (e.g., `src/hooks/useVaultQuizzesForDate.ts`) that:
- Reads `vault_focus_quizzes` for a given `entry_date` (today).
- Returns `{ quizzes, isLoading, refreshQuizzes }`.
- Provides a thin `saveFocusQuiz` wrapper that reuses the existing `useVault` `saveFocusQuiz` or directly inserts/upsets into `vault_focus_quizzes` and refreshes.

This avoids pulling the heavy `useVault` hook into `HammerDailyPlan` and keeps the surface scoped.

3.2 `HammerCheckInCard` component
Create `src/components/hammer/HammerCheckInCard.tsx` that renders a plan card for a given quiz type:
- Icon + title: Morning (Sun), Pre-Workout (Dumbbell), Night (Moon).
- Subtitle describing what the check-in captures in one line.
- Status badge: pending / completed.
- Primary action button: "Open check-in" when pending, "Done" when completed. Tapping the button opens the quiz dialog.
- Visual style matching the existing `BlockCard` / `WkPrescriptionCard` aesthetic (rounded-lg border, muted background, consistent padding).
- Completed state should look like a checked-off task (opacity, checkmark, etc.) but not be a second source of truth.

3.3 Wire into `HammerDailyPlan.tsx`
- Add local state for the quiz dialog: `selectedQuiz: 'morning' | 'pre_lift' | 'night' | null` and `quizOpen`.
- Use the new hook to get today's quiz completion states.
- Insert the cards in the daily order:
  1. **Morning check-in** — before the first warmup block.
  2. **Pre-workout check-in** — after `WarmupCrossoverAddons` and before `WkSpeedCard`.
  3. **Night check-in** — after `WkConditioningCard` (last task of the day).
- Render one `<VaultFocusQuizDialog>` at the bottom of the card, controlled by the local state, with `onSubmit` wired to the save function from the hook.
- On successful submit, refresh the quiz list so the cards update.

3.4 Date handling
- Because `HammerDailyPlan` currently renders today's plan (no explicit `planDate`), the check-in cards will use today's local date. This matches the existing `useVault` behavior.
- If the plan is ever rendered for a non-today date, the cards can fall back to hidden or read the same date; but for now, this is not required.

4. Acceptance criteria
- Morning, Pre-Workout, and Night cards appear in the Hammers Today plan in the correct chronological order.
- Each card shows a "completed" state when the corresponding `vault_focus_quizzes` row exists for today.
- Tapping the action opens the existing `VaultFocusQuizDialog` with the right quiz type.
- Submitting the quiz updates the card state without requiring a page refresh.
- No new check-in data model is created; we reuse the existing Vault Focus Quiz system.
- Cards respect the same styling/dark-mode/semantic-token conventions as the rest of the plan.

5. Files to touch
- `src/hooks/useVaultQuizzesForDate.ts` — new focused hook.
- `src/components/hammer/HammerCheckInCard.tsx` — new card component.
- `src/components/hammer/HammerDailyPlan.tsx` — insert cards and wire the dialog.
- Possibly update `src/hooks/useVault.ts` if `saveFocusQuiz` needs to be exposed independently (or just import it in the new hook).
