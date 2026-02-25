

# Add Existing Activities to Activity Folders

## Overview

Allow users to import their existing custom activities (from the Custom Activity Templates) into a new or existing activity folder, rather than manually re-entering each item.

---

## How It Works

When adding items to a folder (via the FolderItemEditor in FolderDetailDialog), a new "Import from Activities" button will appear alongside the manual entry form. Clicking it opens a searchable picker dialog showing the user's existing custom activity templates. Selecting one or more activities will pre-fill and insert them as folder items, copying over the title, description, type, duration, and exercises.

---

## Changes

### 1. New Component: ActivityPickerDialog

**File: `src/components/folders/ActivityPickerDialog.tsx`**

A dialog that:
- Queries `custom_activity_templates` for the current user's active (non-deleted) templates filtered by sport
- Displays them in a searchable, selectable list (title, type, duration)
- Allows multi-select with checkboxes
- On confirm, maps each selected template into a `Partial<ActivityFolderItem>` and calls the `onAdd` callback for each

Mapping from template to folder item:
- `title` from template `title`
- `description` from template `description`
- `item_type` mapped from template `activity_type` (e.g. "workout" to "exercise", "mobility" to "mobility", etc.)
- `duration_minutes` from template `duration_minutes`
- `exercises` from template `exercises` (JSON carried over)
- `notes` left empty (coach can add after import)

### 2. Update FolderItemEditor

**File: `src/components/folders/FolderItemEditor.tsx`**

- Add an "Import from Activities" button (e.g. with a `Library` icon) next to the existing "Add Item" button
- Clicking it opens the `ActivityPickerDialog`
- When activities are selected and confirmed, each is added via the existing `onAdd` callback

### 3. Update FolderDetailDialog

**File: `src/components/folders/FolderDetailDialog.tsx`**

- Pass the current folder's `sport` down to `FolderItemEditor` so the picker can filter templates by sport

---

## Technical Details

### Database Query (in ActivityPickerDialog)

```sql
SELECT id, title, activity_type, description, duration_minutes, exercises, icon, color
FROM custom_activity_templates
WHERE user_id = auth.uid()
  AND sport = :sport
  AND deleted_at IS NULL
ORDER BY title ASC
```

No new tables or migrations needed -- this reads from the existing `custom_activity_templates` table.

### Files Created

| File | Purpose |
|------|---------|
| `src/components/folders/ActivityPickerDialog.tsx` | Searchable picker for importing existing activities |

### Files Modified

| File | Change |
|------|--------|
| `src/components/folders/FolderItemEditor.tsx` | Add "Import from Activities" button that opens the picker |
| `src/components/folders/FolderDetailDialog.tsx` | Pass `sport` prop to FolderItemEditor |
