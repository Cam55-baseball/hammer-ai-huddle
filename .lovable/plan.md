
# Add Log Sets to Folder Activities on Game Plan

## Problem

When a folder activity is opened from the Game Plan, the "Log Sets" section doesn't appear -- even though the activity has exercises. This is because the `onSavePerformanceData` prop is never passed to `CustomActivityDetailDialog` for folder items (line 2395). The dialog checks `onSavePerformanceData && (...)` before rendering the Log Sets section, so it's always hidden for folder activities.

## Solution

Pass an `onSavePerformanceData` handler to `CustomActivityDetailDialog` in the folder item rendering path. This handler will persist exercise set data to `folder_item_completions.performance_data` -- the same table already used for folder checkbox states.

## Changes

### 1. Add `onSavePerformanceData` prop to folder item dialog (`src/components/GamePlanCard.tsx`)

In the folder item `CustomActivityDetailDialog` block (around line 2395), add:

```text
onSavePerformanceData={async (data) => {
  const itemId = selectedFolderTask.folderItemData!.itemId;
  // Merge new exercise set data into existing performance_data
  // Reuse saveFolderPerformanceData (new function)
  await saveFolderPerformanceData(itemId, data);
  // Update local state so the dialog reflects saved data
  refetch();
  toast.success('Performance data saved');
}}
```

### 2. Add `saveFolderPerformanceData` function to `useGamePlan.ts` (`src/hooks/useGamePlan.ts`)

Add a new function alongside `saveFolderCheckboxState` that merges arbitrary performance data (including `exerciseSets`) into the `folder_item_completions` row for today:

```text
const saveFolderPerformanceData = async (itemId, data) => {
  // Find or create today's completion row
  // Merge data into existing performance_data (preserving checkboxStates)
  // Upsert to folder_item_completions
}
```

This keeps checkbox state intact while adding exercise set data alongside it.

### 3. Export the new function from `useGamePlan.ts`

Add `saveFolderPerformanceData` to the hook's return object so `GamePlanCard` can use it.

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add `saveFolderPerformanceData` function; export it |
| `src/components/GamePlanCard.tsx` | Pass `onSavePerformanceData` to the folder item `CustomActivityDetailDialog` using the new function |
