

# Fix: Allow Editing and Scheduling of Imported Activities

## Problem

When importing activities from the picker, they are saved immediately to the folder without giving the user a chance to edit the title, set assigned days, pick specific dates, set cycle week, or add notes. The user expects imported activities to pre-fill the editor form so they can customize scheduling before saving -- just like creating a new item manually.

## Solution

Change the import flow so that selected activities **pre-fill the editor form** instead of saving immediately. When multiple activities are selected, they are queued and the user edits/saves each one in sequence.

---

## How It Works

1. User clicks "Import from Activities" and selects one or more activities
2. Instead of saving immediately, the selected activities are placed in an **import queue**
3. The first queued activity's data (title, description, type, duration) pre-fills the editor form fields
4. User can now adjust the schedule (assigned days, specific dates, cycle week, notes, etc.)
5. User clicks "Add Item" to save -- the next queued activity then fills the form automatically
6. A small badge shows how many remain in the queue (e.g., "Importing 2 of 3")
7. User can cancel the remaining queue at any time

---

## Changes

### File: `src/components/folders/FolderItemEditor.tsx`

- Add an `importQueue` state (`Partial<ActivityFolderItem>[]`) to hold pending imported items
- Change the `onImport` callback: instead of calling `onAdd` in a loop, set the queue with all selected items
- Add a `useEffect` that watches the queue: when items exist and the form is empty, pop the first item and fill all form fields (title, description, itemType, durationMinutes)
- Show a small info banner when the queue is active: "Importing 1 of N -- edit and click Add Item to save"
- After the user clicks "Add Item" and the item saves successfully, auto-fill the next queued item
- Add a "Skip" or "Cancel Import" button to clear the remaining queue
- The existing "Add Item" button text changes to "Add and Next" when more items remain in the queue

### File: `src/components/folders/ActivityPickerDialog.tsx`

No changes needed -- it already returns the selected items via `onImport`. The behavior change is entirely in `FolderItemEditor`.

---

## Technical Details

### New State in FolderItemEditor

```text
importQueue: Partial<ActivityFolderItem>[]   -- items waiting to be edited and saved
importTotal: number                          -- total count for "X of Y" display
```

### Flow Logic

1. `onImport` callback sets `importQueue` and `importTotal`
2. `useEffect` on `importQueue`: if queue has items and title is empty, shift the first item and populate form fields
3. On successful `handleAdd`, if queue still has items, populate next item into form
4. "Cancel Import" clears the queue and resets the form

### Files Modified

| File | Change |
|------|--------|
| `src/components/folders/FolderItemEditor.tsx` | Add import queue logic, pre-fill form from queue, show queue progress banner |

