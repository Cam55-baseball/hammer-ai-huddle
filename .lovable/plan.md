

# Folder and Activity Scheduling Fixes

## Overview

Four fixes: explicit Save button for folder edits, upgraded scheduling with specific date + weekly + no-schedule options, scroll bug fix in folder edit dialog, and stability improvements.

## Changes

### 1. Explicit Save Button for Folder Edit View

**File: `src/components/folders/FolderDetailDialog.tsx`** (lines 474-488)

Currently, the "Edit Folder" button opens a nested Dialog with `FolderBuilder` inside. `FolderBuilder` already has its own Save/Cancel buttons, so folder edits are NOT auto-saving -- changes persist only when "Update Folder" is clicked.

However, the nested Dialog wrapping is causing issues (scroll lock, confusing UX). The fix:

- Remove the nested `<Dialog>` wrapper around `FolderBuilder` when editing
- Instead, swap the folder detail view to show the `FolderBuilder` inline (similar to how `FolderTabContent` handles it)
- Add an unsaved-changes guard: track `isDirty` state and show a "Save / Discard" confirmation (`AlertDialog`) if the user tries to close the folder detail dialog while editing

### 2. Calendar Planning -- Scheduling Options Upgrade

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

Add a scheduling mode selector to the builder (for both standalone and folder-item contexts). Three options:

- **Specific Date**: Calendar date picker places the activity on an exact date. Store as `specific_dates` array on `custom_activity_templates` (or on `activity_folder_items` when inside a folder)
- **Days of the Week**: Existing `recurring_days` / `recurring_active` flow (unchanged)
- **No Schedule**: Activity is created but not auto-placed; user places it manually later

Implementation:
- Add a `scheduleMode` state: `'none' | 'weekly' | 'specific_date'`
- When `scheduleMode === 'specific_date'`, show a multi-date calendar picker (reuse the pattern from `FolderItemEditDialog` lines 139-174)
- When `scheduleMode === 'weekly'`, show the existing day-picker
- When `scheduleMode === 'none'`, hide scheduling controls
- On save, map `scheduleMode` to the correct fields (`recurring_days`, `recurring_active`, `specific_dates`)

**File: `src/components/folders/FolderDetailDialog.tsx`**

When creating/editing folder items via `CustomActivityBuilderDialog`, pass `specific_dates` and `assigned_days` from the item's data into the builder template, and persist them back on save.

**Database**: The `custom_activity_templates` table needs a `specific_dates` column (text array) if it doesn't already exist. The `activity_folder_items` table already has `specific_dates` and `assigned_days`.

### 3. Vertical Scroll Bug -- Folder Edit View

**File: `src/components/folders/FolderDetailDialog.tsx`**

Root cause: The "Edit Folder" flow opens a nested `<Dialog>` inside the already-open folder detail `<Dialog>`. When the nested dialog closes, the parent dialog's scroll state breaks.

Fix:
- Replace the nested Dialog approach with inline rendering: when "Edit Folder" is clicked, replace the items list with the `FolderBuilder` component inside the same scrollable container
- This eliminates the nested dialog entirely, preventing scroll lock
- The folder detail dialog's `overflow-y-auto` on the content div (line 262) continues to work normally

### 4. Stability and Integration

- Ensure the `FolderBuilder` used inline resets properly when toggling between view and edit modes
- Ensure `CustomActivityBuilderDialog` scheduling options work identically whether the activity is standalone or inside a folder
- The `handleEditItemSave` function already persists `template_snapshot` with full data -- extend it to include `assigned_days` and `specific_dates`

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/folders/FolderDetailDialog.tsx` | Replace nested edit dialog with inline `FolderBuilder`; add unsaved-changes guard; persist `assigned_days`/`specific_dates` on folder item save |
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | Add `scheduleMode` selector with 3 options (Specific Date, Weekly, No Schedule); add multi-date picker UI; pass schedule data on save |
| `src/types/customActivity.ts` | Add `specific_dates?: string[]` to `CustomActivityTemplate` type if not present |
| Database migration | Add `specific_dates` column to `custom_activity_templates` if needed |

