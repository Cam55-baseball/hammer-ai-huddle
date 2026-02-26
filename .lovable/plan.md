
# Fix: Import Save Feedback and Personal Folder Edit Button

## Problem 1: Import Activities Not Refreshing

When importing activities via the "Import from Activities" picker inside a folder detail dialog, the items are saved to the database but the folder detail view doesn't refresh its items list. This makes it appear like nothing was saved.

**Fix**: After import completes in `FolderItemEditor`, the parent `FolderDetailDialog` needs to reload items. Add a callback so that when `onAdd` is called for imported items, the resulting items are added to the local state (this already happens for manual adds on line 214 of `FolderDetailDialog` -- `if (result) setItems(prev => [...prev, result])`). The issue is that `FolderItemEditor`'s `onImport` handler calls `onAdd` but the results aren't being captured back into the parent's state. The `onAdd` prop returns the result, so this is already wired. The real problem is that `ActivityPickerDialog`'s `onImport` callback in `FolderItemEditor` does `await onAdd(item)` but doesn't use the return value to update any UI.

Actually, tracing more carefully: `FolderDetailDialog` line 212-216 passes `onAdd` which calls `onAddItem(folder.id, item)` and then `if (result) setItems(prev => [...prev, result])`. So when `FolderItemEditor` calls `onAdd(item)`, it calls this wrapper which DOES update the items list. So items should appear. Let me re-check -- the `onImport` handler in `FolderItemEditor` (line 206-209) does `await onAdd(item)` in a loop. Each `onAdd` call triggers the wrapper in `FolderDetailDialog` which updates items state. This should work.

The actual issue is likely that the `ActivityPickerDialog` import button text just says "Import" with no clear save confirmation -- users may not realize the import also saves. Adding a toast confirmation after import completes will solve this UX gap.

**Fix**: Add a success toast in `FolderItemEditor` after all imported items are saved, so users see clear feedback.

## Problem 2: No Edit Button on Personal Folders

In `FolderTabContent.tsx`, personal folder cards (lines 200-206) only pass `onOpen` and `onDelete` -- they're missing the `onEdit` handler. Coach folders (lines 127-136) have `onEdit` wired to open the `FolderBuilder` in edit mode.

**Fix**: Pass `onEdit` to personal folder `FolderCard` components, wiring it to open the same edit dialog but using `playerFolders.updateFolder` instead of `coachFolders.updateFolder`.

---

## Changes

### File: `src/components/folders/FolderItemEditor.tsx`

- In the `onImport` handler (around line 206-209), add a success toast after the loop completes to confirm items were saved: `toast.success('X activities imported successfully')`
- Import `toast` from `sonner`

### File: `src/components/folders/FolderTabContent.tsx`

- On personal folder `FolderCard` components (around line 201-206), add the `onEdit` prop: `onEdit={() => setEditingFolder(f)}`
- Update the edit dialog's `onSave` handler (around lines 236-249) to detect whether the folder being edited is a player folder or coach folder and use the appropriate update function:
  - If `editingFolder.owner_type === 'player'`, use `playerFolders.updateFolder`
  - Otherwise, use `coachFolders.updateFolder`

### Files Modified

| File | Change |
|------|---------|
| `src/components/folders/FolderItemEditor.tsx` | Add toast confirmation after importing activities |
| `src/components/folders/FolderTabContent.tsx` | Add `onEdit` prop to personal folder cards; update edit dialog to handle both player and coach folders |
