

# Folder Editing and Activity Card Fixes

## 1. Critical Bug: Edit Click Triggers Deletion

**Root cause**: In `FolderTabContent.tsx`, the `onDelete` prop on `FolderCard` calls `deleteFolder()` immediately with no confirmation dialog. The dropdown menu items for "Edit" and "Delete" are adjacent, and clicking Edit may be visually misaligning with the Delete handler due to dropdown rendering. Additionally, there is zero confirmation on delete -- one accidental tap permanently removes the folder.

**Fix**:
- Add a confirmation dialog (`AlertDialog`) before any folder deletion in `FolderTabContent.tsx`
- Replace the direct `onDelete={() => playerFolders.deleteFolder(f.id)}` and `onDelete={() => coachFolders.deleteFolder(f.id)}` calls with a state-based flow: set a `deletingFolder` state, show confirm dialog, then delete on confirm
- This eliminates accidental deletions entirely

## 2. Folder Action Buttons at Bottom of Folder View

**Current state**: Inside `FolderDetailDialog.tsx`, only "Create Activity" and "Import" buttons exist, embedded in the scrollable content area.

**Fix**:
- Add a fixed footer section (outside the scrollable div) with four horizontally laid-out buttons: **Create Activity**, **Import**, **Edit Folder**, **Delete Folder**
- "Edit Folder" opens the `FolderBuilder` in a dialog (same pattern as `FolderTabContent.tsx` line 237-254) pre-populated with folder data
- "Delete Folder" shows a confirmation `AlertDialog`, then deletes and closes the detail dialog
- New props needed on `FolderDetailDialog`: `onEditFolder`, `onDeleteFolder`

## 3. Scroll Lock Bug After Editing an Item

**Root cause**: `FolderItemEditDialog` uses `onPointerDownOutside={(e) => e.preventDefault()}` which can interfere with the parent dialog's scroll state. When the nested dialog closes, the parent `DialogContent` overflow may not reset properly.

**Fix**:
- Remove `onPointerDownOutside` prevention from `FolderItemEditDialog` (it's unnecessary for a simple edit form)
- Ensure the parent scrollable div re-renders properly by keying off the `editingItem` state change
- Add `overscrollBehavior: 'contain'` is already present; add explicit re-enable of scroll after dialog close

## 4. Remove Folder-Level Weekly Scheduling

**Current state**: `FolderBuilder.tsx` lines 147-166 render "Frequency (Days Per Week)" day picker buttons at the folder level. The `frequency_days` field is saved to the folder.

**Fix**:
- Remove the entire "Frequency (Days Per Week)" section from `FolderBuilder.tsx`
- Stop saving `frequency_days` in the `handleSave` function (always pass `null`)
- Scheduling remains available at the individual activity/item level via `FolderItemEditDialog` and `CustomActivityBuilderDialog`

## 5. Full Edit Access for Activity Cards Inside Folders

**Current state**: Clicking the pencil icon on a folder item opens `FolderItemEditDialog` -- a lite form with only title, type, description, days, duration, and notes. It lacks icon, color, exercises, meals, custom fields, intensity, etc.

**Fix**:
- Replace `FolderItemEditDialog` usage with `CustomActivityBuilderDialog` in edit mode
- When the pencil icon is clicked, open the full builder pre-populated with the item's `template_snapshot` data
- On save, update the `activity_folder_items` row with the full updated data (title, exercises, template_snapshot, etc.)
- Keep `FolderItemEditDialog` file for now (no deletion) but stop using it in `FolderDetailDialog`

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/components/folders/FolderTabContent.tsx` | Add `AlertDialog` for delete confirmation; pass `onEditFolder`/`onDeleteFolder` to `FolderDetailDialog` |
| `src/components/folders/FolderDetailDialog.tsx` | Add fixed footer with 4 action buttons; accept new props `onEditFolder`/`onDeleteFolder`; replace `FolderItemEditDialog` with `CustomActivityBuilderDialog` for editing items; add delete confirmation dialog |
| `src/components/folders/FolderBuilder.tsx` | Remove "Frequency (Days Per Week)" section (lines 147-166); set `frequency_days: null` in save |
| `src/components/folders/FolderItemEditDialog.tsx` | Remove `onPointerDownOutside` to fix scroll lock |

### New Props on FolderDetailDialog

```text
onEditFolder?: (folder: ActivityFolder, updates: Partial<ActivityFolder>) => Promise<void>;
onDeleteFolder?: (folderId: string) => Promise<void>;
```

### Folder Detail Footer Layout

```text
+--------------------------------------------------+
| [+ Create]  [Import]  [Edit Folder]  [Delete]   |
+--------------------------------------------------+
```

All four buttons horizontal, left-aligned, in a `flex gap-2` footer pinned below the scroll area. Delete button styled with `variant="destructive"` and triggers an `AlertDialog`.

### Activity Item Full Edit Flow

When pencil icon is clicked on a folder item:
1. Build a `CustomActivityTemplate` object from the item's `template_snapshot` + top-level fields
2. Open `CustomActivityBuilderDialog` with `editingTemplate` prop
3. On save, update the database row with new title, exercises, and full `template_snapshot`
4. Update local `items` state with the result

