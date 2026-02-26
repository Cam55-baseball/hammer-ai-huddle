

# Unify Folder Item and Custom Activity Detail Dialogs on Game Plan

## Problem
When a user taps an activity on the Game Plan, the dialog looks completely different depending on whether it came from a custom activity or a folder. The custom activity dialog has a rich colored header with icon, progress counter, checkable exercises/vitamins/supplements, scheduled time picker, Edit/Mark Complete/Skip buttons. The folder item dialog is a plain white dialog with basic text and a generic "Log Sets" performance logger that always shows (even for nutrition items where it makes no sense).

## Solution
Replace the current folder item dialog (lines 2284-2396 in GamePlanCard.tsx) with a layout that mirrors the `CustomActivityDetailDialog` design:

### 1. Redesign Folder Item Dialog in `GamePlanCard.tsx`

**Header**: Colored background matching `folderColor`, icon (from `folderIcon`), title, progress counter (checkable items count), and category label (item_type).

**Content sections** (matching CustomActivityDetailDialog order):
- Description (if present)
- Duration and type badges (pill-shaped, like custom activity)
- Exercises list with checkboxes (if `item.exercises` exists) -- individual exercise items are checkable, same styling as custom activity exercises
- Notes section
- Schedule display
- **Scheduled Time** section with tap-to-set (reuse the same time picker pattern from CustomActivityDetailDialog)
- **Performance Logger** -- only show "Log Sets" if `item_type` is exercise/skill_work/flexible, NOT for nutrition/recovery/mobility types

**Footer buttons** (matching CustomActivityDetailDialog):
- "Edit Activity" button (left, outline) -- opens FolderItemEditDialog
- "Mark Complete" button (right, colored) -- completes the item
- "Skip for Today" button (bottom, amber outline)

### 2. Add Checkbox State Tracking for Folder Item Exercises

Currently folder items don't track individual exercise checkbox states. We need to:
- Store checkbox states in the `performance_data` JSONB column of `folder_item_completions` (same pattern as custom activities using `checkboxStates`)
- Add local state in the dialog for tracking checked exercises
- Save checkbox toggles immediately to the database (same debounce pattern)

### 3. Conditionally Show Performance Logger

Only show the "Log Sets" performance logger when `item_type` is one of: `exercise`, `skill_work`, or when the item has no exercises array (flexible mode). Hide it for `mobility`, `recovery`, and nutrition-type items that don't need set logging.

### 4. Match Visual Layout Exactly

The folder item dialog should use:
- Same `p-0 overflow-hidden` DialogContent styling
- Same colored header area with `backgroundColor: ${color}20`
- Same rounded icon box with white icon
- Same Badge for progress counter
- Same pill-shaped duration/intensity badges
- Same exercise card styling (rounded-lg bg-muted p-3 with checkbox)
- Same button layout (Edit left, Complete right, Skip below)

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Replace folder item dialog (lines 2284-2396) with unified layout matching CustomActivityDetailDialog. Add exercise checkbox state management, conditional performance logger, time picker, skip button. |
| `src/hooks/useGamePlan.ts` | Add `folderIcon` to `folderItemData` interface so the dialog can render the correct icon |

### Folder Item Dialog Structure (new)

```text
[Colored Header Background]
  [Icon Box]  Title          [0/2 badge]
              Folder Name (dot + name)

[Scrollable Content]
  Description text...

  [Duration pill]  [Type pill]

  -- Exercises (if any) --
  [x] Exercise 1 - 3x15 @ 135lbs
  [ ] Exercise 2 - sets/reps details

  -- Notes --
  Coach notes here...

  -- Schedule --
  Mon, Tue, Wed, Thu, Fri

  -- Log Sets (only for exercise/skill_work types) --
  Performance logger component

  -- Scheduled Time --
  Tap to set time (same as custom activity)

  [Edit Activity]  [Mark Complete]
  [Skip for Today]
```

### Exercise Checkbox Persistence

Checkbox states will be stored in `folder_item_completions.performance_data.checkboxStates` as `Record<string, boolean>`, keyed by exercise index (`exercise_0`, `exercise_1`, etc.). This mirrors the custom activity pattern without requiring schema changes.

### Icon Mapping

The `folderIcon` field from the folder is already available in `FolderGamePlanTask`. It will be mapped using the existing `customActivityIconMap` in useGamePlan.ts to render the same icon component in the dialog header.

