

# Show Activity Details + Edit on Game Plan (Folder Items)

## Problem
When clicking a folder item on the Game Plan, the dialog only shows the item title and folder name. There's no description, item type, duration, notes, schedule, or exercises visible. Users also cannot edit the folder item from the Game Plan.

## Changes

### 1. Enrich Folder Item Dialog (`src/components/GamePlanCard.tsx`)

Update the folder item dialog (lines 2282-2309) to show full item details before the performance logger:

- **Item description** (from `item.description`)
- **Item type** badge (exercise, mobility, recovery, etc.)
- **Duration** (if `item.duration_minutes` is set)
- **Notes** (if `item.notes` is set)
- **Assigned days** or **specific dates** schedule info
- **Exercises list** (from `item.exercises` array) showing name, sets, reps, weight, duration
- **Folder name** with colored dot indicator
- **Edit button** that opens an inline edit mode or a new `FolderItemEditDialog`

### 2. Add `isOwner` flag to `folderItemData` (`src/hooks/useGamePlan.ts`)

Extend the `folderItemData` interface to include `isOwner: boolean`, set by comparing `folder.owner_id === user.id` during task building. This controls whether the Edit button is visible.

### 3. Create `FolderItemEditDialog` (`src/components/folders/FolderItemEditDialog.tsx`)

A new dialog for editing an existing folder item, pre-populated with current values:

- **Fields**: title, description, item type, duration, notes, assigned days (toggle buttons), specific dates (calendar), cycle week
- **Save**: calls `supabase.from('activity_folder_items').update(...)` and refreshes the Game Plan
- Reuses the same field layout as `FolderItemEditor` but in edit mode

### 4. Add Edit button to `FolderDetailDialog` (`src/components/folders/FolderDetailDialog.tsx`)

Add a pencil/edit icon next to each item (for owners) that opens the `FolderItemEditDialog`. On save, update items in local state.

### 5. Update `useActivityFolders` hook

Add success toast to `updateItem` function so users get confirmation.

---

## Technical Details

### `folderItemData` interface change (useGamePlan.ts)

```text
folderItemData?: {
  folderId: string;
  folderName: string;
  folderColor: string;
  itemId: string;
  placement: string;
  isOwner: boolean;  // NEW
}
```

Set during task building by checking `folder.owner_id === user.id`.

### Enriched dialog layout (GamePlanCard.tsx)

```text
Title                                    [Edit]
Folder: Before Work (colored dot)
[exercise badge]  [15m badge]

Description text here...

Exercises:
  1. Push-ups - 3x15
  2. Plank - 60s hold

Notes: Focus on form

Schedule: Mon, Wed, Fri

--- Performance Logger ---
```

### FolderItemEditDialog fields

Pre-populated from the `ActivityFolderItem` object found via `folderTasks.find(...)`:
- title (Input)
- description (Textarea)
- item_type (Select from ITEM_TYPES)
- duration_minutes (Input number)
- notes (Textarea)
- assigned_days (day-of-week toggle buttons)
- specific_dates (calendar date picker)
- cycle_week (number input, if applicable)

On save: `supabase.from('activity_folder_items').update({...}).eq('id', itemId)`, then call `refetch()` to refresh Game Plan.

### Files

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add `isOwner` to `folderItemData` interface and task builder |
| `src/components/GamePlanCard.tsx` | Enrich folder item dialog with full details + Edit button |
| `src/components/folders/FolderItemEditDialog.tsx` | **New** -- edit dialog for folder items |
| `src/components/folders/FolderDetailDialog.tsx` | Add edit button per item, open `FolderItemEditDialog` |
| `src/hooks/useActivityFolders.ts` | Add success toast to `updateItem` |
