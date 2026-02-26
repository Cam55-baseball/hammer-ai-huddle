

# Unify Activity Detail into ONE Component

## Current State

There are currently **two separate dialog implementations**:

1. **`CustomActivityDetailDialog`** -- the rich, full-featured dialog used for custom activities AND folder items that have a `template_snapshot`
2. **Fallback folder dialog** -- a separate inline dialog built directly inside `GamePlanCard.tsx` (lines 2462-2849) for folder items WITHOUT a `template_snapshot`

The snapshot path already works correctly -- folder items imported with a snapshot render through `CustomActivityDetailDialog` and look identical to custom activities. The problem is the **fallback path**: folder items created before snapshots existed, or manually created folder items, still use a completely different dialog with different styling, different button placement, and different features.

## Solution

**Eliminate the fallback dialog entirely.** ALL folder items -- with or without a `template_snapshot` -- should construct a pseudo-template and render through `CustomActivityDetailDialog`. This guarantees one component, one layout, one experience.

### Step 1: Route ALL Folder Items Through CustomActivityDetailDialog

**File: `src/components/GamePlanCard.tsx`**

Replace the fallback dialog (lines 2462-2849) with the same pseudo-template construction logic already used for snapshot items. For folder items without a snapshot:

- Build `pseudoTemplate` from the raw folder item fields (`title`, `description`, `item_type`, `exercises`, `duration_minutes`)
- Use the folder's `folderColor` and `folderIcon` as the template's `color` and `icon`
- Map the folder item's `exercises` array into the template's exercises format
- Map `item_type` to `activity_type` (e.g., `exercise` stays `exercise`, `skill_work` stays, etc.)
- Set `meals`, `custom_fields`, `intervals` to empty defaults since raw folder items don't have these
- Pass notes from `item.notes` into the template's `description` (appended after existing description)

This means the IIFE block starting at line 2323 will handle ALL cases in one branch, not two.

### Step 2: Normalize Folder Item Exercises to Template Exercise Format

**File: `src/components/GamePlanCard.tsx`**

Folder item exercises are stored as raw JSON arrays with fields like `name`, `sets`, `reps`, `weight`, `weight_unit`, `notes`. The `CustomActivityDetailDialog` expects exercises in the `Exercise` type format with fields like `id`, `name`, `sets`, `reps`, `weight`, `weightUnit`.

Add a small mapper function:

```text
function mapFolderExercisesToTemplateFormat(exercises: any[]): Exercise[] {
  return exercises.map((ex, idx) => ({
    id: `folder_ex_${idx}`,
    name: ex.name || `Exercise ${idx + 1}`,
    type: ex.type || 'other',
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    weightUnit: ex.weight_unit || ex.weightUnit || 'lbs',
    duration: ex.duration,
    rest: ex.rest,
    notes: ex.notes,
  }));
}
```

### Step 3: Handle Category Label for Folder Items

The `CustomActivityDetailDialog` shows the category as `t('customActivity.types.${template.activity_type}')`. For folder items, we want it to show the folder name instead (like "Before Work"). 

Add an optional `categoryLabel` prop to `CustomActivityDetailDialog` that overrides the default translation. When rendering folder items, pass the folder name as `categoryLabel`.

### Step 4: Handle Edit Button for Folder Items

The `onEdit` callback already works -- for folder items it opens `FolderItemEditDialog`, for custom activities it opens `CustomActivityBuilderDialog`. No change needed here, just ensure the `isOwner` check is wired correctly (the `onEdit` prop is always passed; the caller controls visibility).

Add an optional `hideEdit` prop to `CustomActivityDetailDialog` so non-owner folder items can hide the Edit button. Pass `hideEdit={!selectedFolderTask.folderItemData.isOwner}` from the folder item path.

### Step 5: Remove All Fallback Dialog Code

**File: `src/components/GamePlanCard.tsx`**

Delete:
- The entire fallback branch (lines 2462-2849): the inline `<Dialog>` with its own header, exercises, notes, schedule, time picker, and action buttons
- The `handleFolderCheckboxToggle` function (lines 2485-2512) -- the unified path already uses `onToggleCheckbox` wired to `saveFolderCheckboxState`
- The `handleFolderSaveTime` and `handleFolderRemoveTime` functions (lines 2514-2526) -- handled by `CustomActivityDetailDialog`'s built-in time picker
- The `showFolderTimePicker` and `tempTime`/`tempReminder` state for folder items (already managed internally by the dialog)
- The `folderSavingFieldIds` state -- the dialog manages its own saving indicators

### Step 6: Clean Up Unused State

**File: `src/components/GamePlanCard.tsx`**

Remove state variables that only existed for the fallback dialog:
- `showFolderTimePicker`
- `folderSavingFieldIds` 
- Related `tempTime`/`tempReminder` usage specific to folder items

Keep `folderCheckboxStates` since it's still used to initialize the pseudo-log's `performance_data`.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/CustomActivityDetailDialog.tsx` | Add optional `categoryLabel` and `hideEdit` props |
| `src/components/GamePlanCard.tsx` | Remove fallback dialog; route all folder items through pseudo-template + CustomActivityDetailDialog; add exercise mapper function; remove unused state |

### Unified Flow (After Change)

```text
User taps folder item on Game Plan
  -> handleTaskClick sets selectedFolderTask + folderLoggerOpen
  -> IIFE block at line 2323 runs
  -> Finds matching folderTask for item data
  -> Builds pseudoTemplate from:
     - template_snapshot (if exists) OR raw item fields
     - folderColor, folderIcon from folder metadata
     - exercises mapped to Exercise[] format
  -> Builds pseudoLog with performanceData.checkboxStates
  -> Renders CustomActivityDetailDialog with:
     - categoryLabel = folderName
     - hideEdit = !isOwner
     - onToggleCheckbox wired to saveFolderCheckboxState
     - onComplete wired to toggleFolderItemCompletion
     - onSkipTask wired to handleSkipTask
```

### What Users Will See

- Folder items (with or without snapshot) render the exact same dialog as custom activities
- Same colored header, same icon box, same progress badge
- Same checklist items with green checkboxes and line-through
- Same scheduled time picker with reminder selector
- Same Edit / Mark Complete / Skip for Today button layout
- Log Sets appears only for exercise/skill_work types
- Folder name shown as category label instead of activity type

