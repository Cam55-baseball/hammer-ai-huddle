

# Make "Skipped for Today" Section Always Visible on Game Plan

## Problem

You have several activities set to skip on Mondays (Morning Check-in, Pre-Workout Check-in, Mind Fuel, Throwing Video, and Hitting Workout), but you can't find the "Skipped for today" section on the Game Plan. The section exists in the code and your skip data is in the database, but the section is:

1. Hidden at the very bottom of a long task list (19+ tasks), easy to miss
2. Collapsed by default, making it even harder to spot
3. Only rendered when skipped tasks are detected -- if there's any loading delay, it briefly disappears

## Plan

### 1. Make the Skipped Section More Prominent (GamePlanCard.tsx)

- Move the "Skipped for today" collapsible **higher** in the card -- place it right after the task sections header area, before the main task list, so it's always visible without scrolling
- Change default state from collapsed (`false`) to **expanded** (`true`) so users immediately see what's been skipped
- Add a small info badge near the Game Plan header showing the skipped count (e.g., "5 skipped") as a visual cue

### 2. Show an Empty State When No Tasks Are Skipped

- Always render the "Skipped for today" section, even when the list is empty
- When empty, show a subtle message like "No activities skipped today" so the feature is always discoverable

## Technical Details

### File: `src/components/GamePlanCard.tsx`

**Change 1**: Update default state for `showSkippedSection` from `false` to `true`

**Change 2**: Remove the `skippedTasksList.length > 0` conditional wrapper so the section always renders

**Change 3**: Add an empty state message inside the collapsible content when `skippedTasksList.length === 0`

**Change 4**: Move the skipped section block from the very bottom of the card (line ~1692) to a more visible position -- right after the Game Plan header/progress area, before the task categories

**Change 5**: Add a skipped count badge near the task counter in the header when `skippedTasksList.length > 0`

