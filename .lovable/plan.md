

# Fix: Skipped Tasks Not Appearing in "Skipped for Today" Section

## Problem

You have 5 activities set to skip on Mondays (Morning Check-in, Pre-Workout Check-in, Mind Fuel, Throwing Video, and Hitting Workout). The database confirms this. However, the "Skipped for today" section shows 0 because of a **double-filtering bug**:

1. `useGamePlan.ts` removes skipped tasks from the task array entirely (via `isSystemTaskSkippedToday`)
2. `GamePlanCard.tsx` then looks for skipped tasks in that array to show in the "Skipped" section -- but they were already removed at step 1, so it finds nothing

The fix is straightforward: stop removing tasks in step 1 and let the UI layer (which already has the correct logic) handle both hiding and displaying skipped tasks.

## Changes

### File: `src/hooks/useGamePlan.ts`

**A. Remove `isSystemTaskSkippedToday()` gates from all `tasks.push()` calls**

Remove the `!isSystemTaskSkippedToday(...)` condition from these 14 task entries, keeping all other conditions (module access, program active, etc.) intact:

- `nutrition` (line 716)
- `mindfuel` (line 729)
- `healthtip` (line 742)
- `quiz-morning` (line 757)
- `quiz-prelift` (line 771)
- `quiz-night` (line 784)
- `workout-unicorn` (line 806)
- `workout-hitting` (line 820)
- `texvision` (line 835)
- `workout-pitching` (line 851)
- `speed-lab` (line 866)
- `video-hitting` (line 882)
- `video-pitching` (line 896)
- `video-throwing` (line 910)

**B. Update `shouldShowTrainingTask()` function**

Remove the `hasCustomSchedule` early-return (lines 703-705) that relies on `gamePlanSkips`. Keep only the default schedule logic so training tasks still respect their default day-of-week schedules when no custom schedule exists.

**C. Remove unused state and helper**

- Remove the `gamePlanSkips` state variable (line 75) and its setter call (line 500)
- Remove the `isSystemTaskSkippedToday` function (lines 695-698)
- Remove the `gamePlanSkipsMap` construction (lines 490, 494-496)

### File: `src/components/GamePlanCard.tsx` -- No changes needed

This file already has the correct end-to-end logic:
- `useCalendarSkips()` fetches skip data from the database (line 79)
- `isWeeklySkipped()` checks if a task is skipped for today (line 832)
- `filterSkippedAndScheduledOff()` hides skipped tasks from the main list (line 868)
- `skippedTasksList` collects them for the "Skipped for today" section (line 883)
- The section is already moved to a prominent position and expanded by default (from the previous change)

## Why This Happened

The `isSystemTaskSkippedToday` filter in `useGamePlan.ts` was added as an optimization to avoid rendering unnecessary tasks. But `GamePlanCard.tsx` was later updated with its own skip detection (via `useCalendarSkips`) that also needs to see those tasks to populate the "Skipped for today" section. The two systems conflict -- one removes tasks, the other needs them present to display them as skipped.

## Risk Assessment

Low. The filtering already works correctly in `GamePlanCard.tsx`. Removing the redundant pre-filter simply lets the existing UI logic function as designed. All module-access checks, program-active checks, and default schedules remain untouched.

