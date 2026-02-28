

# Activity Editing, Scheduling Order, and Folder Logic Fixes

## Overview

Three fixes: resolve the scroll cutoff in the activity builder dialog, add drag-and-drop reordering for folder items, and remove the three-dot menu from personal folder cards.

## 1. Critical Scroll Issue -- Edit Activity View

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

**Root cause**: Line 418 uses `<ScrollArea className="max-h-[calc(90vh-140px)]">` with an inner `<div className="... overflow-hidden">` (line 419). The `ScrollArea` component uses Radix's virtual scrollbar which miscalculates content height, and `overflow-hidden` clips content further. The save footer at line 940 sits outside the scroll container, consuming part of the 90vh budget that the ScrollArea's calc doesn't fully account for.

**Fix**:
- Remove the `ScrollArea` wrapper entirely
- Change the `DialogContent` (line 396) to use flex-column layout: `className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden"`
- Replace the `ScrollArea` with a plain `<div className="flex-1 overflow-y-auto px-3 sm:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>` 
- Remove `overflow-hidden` from the inner content div (line 419), change to just `className="space-y-6 py-4"`
- The footer (line 940) stays as `flex-shrink-0` -- already correct
- This ensures native browser scrolling reaches every field, toggle, and the save button on all devices

## 2. Drag-and-Drop Reordering of Folder Items

**File: `src/components/folders/FolderDetailDialog.tsx`**

The `@dnd-kit/sortable` package is already installed. Items already load sorted by `order_index`. The missing piece is the reorder UI.

**Changes**:
- Import `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`
- Import `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove` from `@dnd-kit/sortable`
- Import `CSS` from `@dnd-kit/utilities` and `GripVertical` from `lucide-react`
- Create a `SortableFolderItem` wrapper component that uses `useSortable` and renders a drag handle (GripVertical icon) alongside each item card
- Wrap the items list (lines 325-402) in `DndContext` + `SortableContext` with `verticalListSortingStrategy`
- On `onDragEnd`, use `arrayMove` to reorder the local `items` state, then persist the new `order_index` values to the database:

```text
const reorderedItems = arrayMove(items, oldIndex, newIndex);
setItems(reorderedItems);
// Batch persist
for (let i = 0; i < reorderedItems.length; i++) {
  await supabase.from('activity_folder_items')
    .update({ order_index: i })
    .eq('id', reorderedItems[i].id);
}
```

- Order persists for both recurring and specific-date items consistently
- New items default to the end of the list (existing behavior via `order_index`)

## 3. Remove Three-Dot Menu from Personal Folder Cards

**File: `src/components/folders/FolderCard.tsx`**

The `MoreVertical` dropdown menu (lines 50-86) contains Edit, Send, Archive, Publish Template, and Delete actions. For personal folders, only Edit and Delete are passed (no `onSend`, `onArchive`, `onPublishTemplate`).

**Fix**:
- Add a new optional prop `showMenu?: boolean` (default `true`) to `FolderCardProps`
- When `showMenu` is `false`, hide the entire `DropdownMenu` block
- Retain the Edit and Delete actions as direct icon buttons on the card (matching the inline pattern used in `FolderDetailDialog` item cards)

**File: `src/components/folders/FolderTabContent.tsx`**

- For the personal folders section (line 231), pass `showMenu={false}` to `FolderCard`
- Coach folders continue to use the dropdown menu (they need Send, Archive, Publish Template actions)

## Technical Summary

| File | Changes |
|------|---------|
| `CustomActivityBuilderDialog.tsx` | Replace `ScrollArea` with flex-column layout using native `overflow-y-auto`; remove `overflow-hidden` from inner div |
| `FolderDetailDialog.tsx` | Add `@dnd-kit/sortable` drag-and-drop reordering with `order_index` persistence |
| `FolderCard.tsx` | Add `showMenu` prop; when false, replace dropdown with inline Edit/Delete buttons |
| `FolderTabContent.tsx` | Pass `showMenu={false}` to personal folder `FolderCard` instances |

