

# Two Features: Custom Calorie Target + Block Builder Discoverability

## 1. Custom Daily Calorie Intake in Nutrition Settings

### Problem
Users can only choose from preset goal types (lose weight, maintain, etc.) with fixed calorie adjustments. There's no way to set a specific custom calorie target.

### Solution
Add a `custom_calorie_target` column to `athlete_body_goals`. In `NutritionHubSettings`, add an optional "Custom Daily Calories" input that appears below the goal selector. When set, `useDailyNutritionTargets` uses this value instead of the TDEE-calculated target.

### Changes

| File | Change |
|------|--------|
| **DB Migration** | `ALTER TABLE athlete_body_goals ADD COLUMN custom_calorie_target integer DEFAULT NULL;` |
| `src/hooks/useAthleteGoals.ts` | Add `customCalorieTarget` to `AthleteBodyGoal` interface and `CreateGoalInput`. Map column in fetch/create/update. |
| `src/hooks/useTDEE.ts` | Expose `customCalorieTarget` from the active goal. |
| `src/hooks/useDailyNutritionTargets.ts` | If `activeGoal.customCalorieTarget` is set, override `calories` with that value and recalculate macro grams proportionally. |
| `src/components/nutrition-hub/NutritionHubSettings.tsx` | Add a "Custom Daily Calories" number input below the goal radio group. When filled, it's saved with the goal. Show a "Use TDEE calculation" reset link to clear it. |

### UX
- Below the goal radio buttons, a new section: "Override Daily Calories (optional)"
- Number input with placeholder showing the current TDEE-calculated value
- Helper text: "Leave blank to use automatic calculation based on your profile"
- When a custom value is set, a small badge appears next to the goal label indicating "Custom"

---

## 2. Make Block-Based Workout Builder Easier to Find

### Problem
The block-based builder toggle is buried inside the activity builder dialog, below a separator and inside a dashed border section. Users creating workout activities may not notice it.

### Solution
Make the block system toggle more prominent and auto-enable it by default for workout activities, with a clear visual callout.

### Changes

| File | Change |
|------|--------|
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | **Three changes:** (1) Default `useBlockSystem` to `true` when `activityType === 'workout'`. (2) Move the block system toggle higher — place it right after the activity type selector instead of below the separator. (3) Add a highlighted callout/banner style (gradient background, icon) to make it stand out. |

### UX
- When user selects "Workout" activity type, the block builder is ON by default
- The toggle is positioned prominently right after activity type selection (before notes/other fields)
- Visual styling: primary-colored left border or subtle gradient background with a Layers icon and "Block-Based Builder" label
- Users can still toggle it off to use the simple drag-and-drop exercise builder

