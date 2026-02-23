

# Fix: The Unicorn Not Appearing on Game Plan

## Problem

When a user starts The Unicorn, the Game Plan reuses the "Iron Bambino" and "Heat Factory" workout tasks (linking to `/production-lab` and `/production-studio`). This is wrong because:

1. The Unicorn is its own unified program -- it should not masquerade as Iron Bambino or Heat Factory
2. The task links point to the wrong pages
3. No dedicated "The Unicorn" task exists on the Game Plan
4. The `shouldShowTrainingTask` default schedule filter may hide the hitting/pitching tasks on certain days, making it look like nothing is there

## Solution

Add a dedicated "The Unicorn" Game Plan task and prevent the old Iron Bambino/Heat Factory tasks from appearing when The Unicorn is the active program.

## Changes

### File: `src/hooks/useGamePlan.ts`

**Training section task generation (around lines 785-850):**

1. Add a new condition: when `activeProgramStatuses['the-unicorn'] === 'active'`, show a single dedicated Unicorn task instead of separate hitting/pitching tasks

2. The dedicated task will:
   - Use the title key `gamePlan.workout.unicorn.title` (fallback: "The Unicorn Workout")
   - Use the description key `gamePlan.workout.unicorn.description` (fallback: "Complete today's Unicorn training session")
   - Link to `/the-unicorn`
   - Use the Sparkles icon (matching the program's branding)
   - Check completion via the existing `workout-hitting` status (since The Unicorn progress is tracked under hitting module)

3. Only show separate Iron Bambino (`workout-hitting`) and Heat Factory (`workout-pitching`) tasks when their specific sub-module is active AND The Unicorn is NOT active

4. Add `'workout-unicorn'` to the default training schedule constants so it shows on appropriate days

### File: `src/constants/trainingSchedules.ts`

- Add a default schedule entry for `'workout-unicorn'` (show on the same days as hitting/pitching combined, or all weekdays)

### File: `src/hooks/useGamePlan.ts` (fetchTaskStatus section)

- Add completion tracking for `workout-unicorn` by checking `last_workout_date` on the `the-unicorn` sub_module_progress row

## Technical Details

The key logic change in the training section:

```text
IF the-unicorn is active:
  Show ONE "The Unicorn" task -> links to /the-unicorn
  Do NOT show Iron Bambino or Heat Factory tasks
ELSE:
  Show Iron Bambino task if production_lab is active
  Show Heat Factory task if production_studio is active
```

This ensures:
- Users who start The Unicorn see it clearly on their Game Plan
- No duplicate or misleading tasks appear
- The task links to the correct page
- Completion tracking works correctly

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useGamePlan.ts` | Add dedicated Unicorn task, prevent Iron Bambino/Heat Factory tasks when Unicorn is active, add Unicorn completion tracking |
| `src/constants/trainingSchedules.ts` | Add default schedule for `workout-unicorn` |

