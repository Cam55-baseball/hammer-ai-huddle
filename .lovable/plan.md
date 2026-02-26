

# Fix: Unify Folder Item and Custom Activity Dialogs

## Root Cause

When a custom activity (like "Morning Supplements") is imported into a folder via the Activity Picker, only 5 fields are copied: `title`, `description`, `item_type`, `duration_minutes`, and `exercises`. All the rich template data -- **vitamins, supplements, meal items, custom fields, icon, color, activity_type, intensity** -- is lost. The folder item's `exercises` column is always null for these items.

This means when you tap "Morning Supplements" from the folder on the Game Plan, the dialog has no vitamins/supplements to show checkboxes for, no icon/color from the original template, and no progress counter. Meanwhile the same activity accessed directly from custom activities shows all of this.

## Solution

### 1. Store full template snapshot when importing into folders

**File: `src/components/folders/ActivityPickerDialog.tsx`** (lines 161-173)

Change the `handleImport` function to copy ALL relevant template data into the folder item. Store the extra data in a new JSONB column `template_snapshot` on `activity_folder_items`:

Data to copy:
- `meals` (vitamins, supplements, meal items)
- `custom_fields`
- `icon` (template icon)
- `color` (template color)
- `activity_type` (e.g., "meal")
- `intensity`
- `intervals`
- `embedded_running_sessions`

### 2. Add `template_snapshot` column to `activity_folder_items`

**Database migration**: Add a nullable JSONB column `template_snapshot` that stores the full original template data at import time. This ensures folder items retain everything needed to render identically.

```text
ALTER TABLE activity_folder_items 
ADD COLUMN template_snapshot jsonb DEFAULT NULL;
```

### 3. Update the `ActivityFolderItem` type

**File: `src/types/activityFolder.ts`**

Add `template_snapshot` to the interface so TypeScript knows about the field.

### 4. Render folder items using `CustomActivityDetailDialog` when they have a template snapshot

**File: `src/components/GamePlanCard.tsx`**

When a folder item has `template_snapshot`, instead of showing the current folder-specific dialog, reconstruct a `CustomActivityTemplate`-like object from the snapshot and render it through the same `CustomActivityDetailDialog` component (or its exact rendering logic). This guarantees pixel-perfect parity:

- Same colored header with the original icon and color
- Same vitamins/supplements checkboxes
- Same progress badge (0/2)
- Same category label ("Meal/Nutrition")
- Same footer buttons (Edit Activity, Mark Complete, Skip for Today)

For folder items WITHOUT a template snapshot (manually created items), continue using the current folder item dialog.

### 5. Wire checkbox persistence for folder items using template snapshot

Reuse the existing `saveFolderCheckboxState` function. The checkbox field IDs will match the same pattern (`vitamin_xxx`, `supplement_xxx`, `meal_xxx`) since they come from the original template data.

### 6. Backfill existing imported items

**File: `src/components/folders/ActivityPickerDialog.tsx`**

For existing items already imported without snapshots (like the current "Morning Supplements"), add a one-time migration or provide a "Re-import" action. The simpler approach: when a folder item has no `template_snapshot`, the dialog renders as it does today. Users can delete and re-import the item to get the full experience.

---

## Technical Details

### Database Migration

```text
ALTER TABLE activity_folder_items 
ADD COLUMN template_snapshot jsonb DEFAULT NULL;
```

### Updated Import Logic (`ActivityPickerDialog.tsx`)

The `handleImport` function changes from:

```text
{
  title, description, item_type, duration_minutes, exercises
}
```

To:

```text
{
  title, description, item_type, duration_minutes, exercises,
  template_snapshot: {
    icon, color, activity_type, intensity,
    meals, custom_fields, intervals, 
    embedded_running_sessions, duration_minutes
  }
}
```

### Dialog Rendering Decision (`GamePlanCard.tsx`)

```text
if (folderItem has template_snapshot) {
  -> Build a pseudo-template from snapshot
  -> Render using CustomActivityDetailDialog layout
     (vitamins, supplements, exercises, custom fields, 
      correct icon/color, progress badge)
} else {
  -> Use current folder item dialog (for manually created items)
}
```

### Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `template_snapshot` JSONB column |
| `src/types/activityFolder.ts` | Add `template_snapshot` to `ActivityFolderItem` |
| `src/components/folders/ActivityPickerDialog.tsx` | Copy full template data into `template_snapshot` on import |
| `src/components/GamePlanCard.tsx` | When `template_snapshot` exists, render folder item dialog using `CustomActivityDetailDialog` layout with full checkboxes, icon, color |
| `src/hooks/useGamePlan.ts` | Pass `template_snapshot` through `FolderGamePlanTask` so dialog can access it |

