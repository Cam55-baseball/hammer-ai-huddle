

# Unify Folder Item and Custom Activity Dialogs on Game Plan

## Problem

The folder item dialog and custom activity dialog on the Game Plan look and behave differently. The custom activity dialog ("Morning Supplements") has a rich layout with checkboxes on each item, a progress counter (e.g., 0/2), a scheduled time picker, and skip/edit/complete buttons. The folder item dialog ("Morning Drink") has a similar shell now but is missing key features: exercise checkboxes, checkbox state persistence, the scheduled time picker, and the progress counter format. Additionally, the custom activity dialog is missing the "Log Sets" performance logger that some activity types need.

## Solution

Make both dialogs feature-complete so they look and behave identically, with the only difference being data source.

---

### 1. Add Checkboxes to Folder Item Exercises (`GamePlanCard.tsx`)

The folder item dialog currently lists exercises as plain text cards. Add interactive checkboxes matching the custom activity style:

- Add `Checkbox` component to each exercise row with green checked styling
- Add line-through text styling when checked
- Track checkbox state in local component state (`folderCheckboxStates`)
- Persist checkbox states to `folder_item_completions.performance_data.checkboxStates` via an upsert function
- Show progress badge as `checked/total` (e.g., "1/3") instead of just the total count
- Auto-complete the folder item when all exercises are checked (same pattern as custom activities)

### 2. Add Scheduled Time Picker to Folder Item Dialog (`GamePlanCard.tsx`)

The custom activity dialog has a full "Scheduled Time" section with time input, reminder selector, and save/remove buttons. Add the same section to the folder item dialog:

- Add `showTimePicker`, `tempTime`, `tempReminder` local state for the folder dialog
- Reuse the same time picker UI pattern (AnimatePresence, motion.div, time input, reminder Select)
- Store folder item times in the existing `taskTimes` / `taskReminders` state objects (keyed by folder item ID)
- Display current time with reminder badge when set

### 3. Add "Log Sets" to Custom Activity Dialog (`CustomActivityDetailDialog.tsx`)

The custom activity dialog currently has no performance logger. Add it conditionally:

- Import `FolderItemPerformanceLogger` (or create a generic version)
- Show the "Log Sets" section only when `activity_type` is `exercise` or `skill_work`, or when the template has exercises but no checkable items
- Wire `onSave` to persist performance data through the existing `updateLogPerformanceData` path
- Add a new `onSavePerformanceData` prop to the dialog

### 4. Fix Progress Badge on Folder Items

Currently shows just the total count. Change to show `checked/total` with green styling when all are checked, matching the custom activity badge exactly.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Add checkbox state management for folder items, add time picker section, fix progress badge format |
| `src/components/CustomActivityDetailDialog.tsx` | Add conditional "Log Sets" performance logger section |
| `src/hooks/useGamePlan.ts` | Add `saveFolderCheckboxState` function to upsert checkbox states into `folder_item_completions.performance_data` |

### Folder Item Checkbox State Persistence

```text
folder_item_completions.performance_data = {
  checkboxStates: {
    "exercise_0": true,
    "exercise_1": false
  },
  sets: [...] // existing Log Sets data
}
```

Uses the same `performance_data` JSONB column already used by the Log Sets feature. The `saveFolderCheckboxState` function will:
1. Check if a completion row exists for today
2. If yes, merge `checkboxStates` into existing `performance_data` via UPDATE
3. If no, INSERT a new row with `completed: false` and the checkbox states
4. This does NOT mark the item complete -- only checking all boxes or pressing "Mark Complete" does that

### Checkbox Rendering (Folder Dialog)

Each exercise gets the same treatment as custom activity exercises:
- Green checkbox (`data-[state=checked]:bg-green-500`)
- Line-through text when checked
- Opacity reduction on details when checked
- Saving spinner per-field

### Log Sets in Custom Activity Dialog

The `FolderItemPerformanceLogger` component already accepts an `item` prop typed as `ActivityFolderItem`. For custom activities, we'll create a thin adapter that maps the custom activity template to the shape the logger expects, or add a new `CustomActivityPerformanceLogger` wrapper that accepts a template and log, showing the same "Log Sets" UI.

Only show when `template.activity_type` is one of: `exercise`, `skill_work`, or when the template has no checkable items but is a physical activity type.

### Unified Dialog Layout (both types)

```text
[Colored Header]
  [Icon]  Title              [2/4 badge]
          Category / Folder name

[Scrollable Content]
  Description
  [Duration pill]  [Intensity/Type pill]
  
  Exercises (with checkboxes)
  Meals / Vitamins / Supplements (custom activity only)
  Custom Fields (custom activity only)
  Notes (folder items)
  Schedule (folder items)
  
  Log Sets (conditional - exercise/skill_work types)
  
  Scheduled Time (tap to set, with reminder)

[Footer]
  [Send to Player] (custom activity only, coaches)
  [Edit Activity]  [Mark Complete]
  [Skip for Today]
```

