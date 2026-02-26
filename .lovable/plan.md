

# Fix: Scroll Issues and Add Save Button in Folder Detail Dialog

## Problem 1: Cannot Scroll When Editing a Folder

The `FolderDetailDialog` uses a Radix Dialog with `max-h-[85vh] overflow-y-auto` on the `DialogContent`. However, Radix Dialog's content uses `fixed` positioning with `translate(-50%, -50%)` centering, which can cause scroll issues -- especially on mobile where touch events may get intercepted. The content overflows when there are many items plus the editor form at the bottom.

**Fix**: Convert the dialog layout to use a flex column with a scrollable body section, and ensure the dialog content properly handles overflow with `-webkit-overflow-scrolling: touch` for mobile. Also add `overscrollBehavior: contain` to prevent scroll chaining.

## Problem 2: No Prominent Save Button

The current "Add Item" button is small and labeled ambiguously. Users importing activities or creating new ones need a clear, prominent **Save** button.

**Fix**: Replace the small `Plus` icon button with a more prominent Save-styled button. Use a `Save` icon (from lucide-react) alongside clear text like "Save Item" (or "Save & Next" during imports). Make it visually distinct with the default primary variant.

---

## Changes

### File: `src/components/folders/FolderDetailDialog.tsx`

- Change the dialog content structure to use a flex column layout with a scrollable middle section
- Add `onPointerDownOutside` handler to prevent accidental closes during scroll
- Structure: fixed header (title) at top, scrollable body in the middle, and the editor/footer pinned at the bottom so it's always visible

### File: `src/components/folders/FolderItemEditor.tsx`

- Replace the `Plus` icon with a `Save` icon from lucide-react
- Change button text from "Add Item" to **"Save Item"** and from "Add & Next" to **"Save & Next"**
- Make the save button more prominent (default size instead of `sm`, or at minimum ensure it stands out visually)

---

## Technical Details

### Dialog Layout (FolderDetailDialog.tsx)

The current flat layout puts everything inside one `overflow-y-auto` container. The fix restructures to:

```text
DialogContent (flex flex-col, max-h-[85vh])
  +-- DialogHeader (flex-shrink-0, sticky top)
  +-- Scrollable body (flex-1 overflow-y-auto, -webkit-overflow-scrolling: touch)
  |     +-- Description
  |     +-- Coach edit toggle
  |     +-- Progress bar
  |     +-- Items list
  +-- Editor section (flex-shrink-0, border-top) -- always visible at bottom
```

This ensures:
- The items list scrolls independently
- The editor (with the save button) is always visible at the bottom
- Touch scrolling works properly on mobile

### Save Button (FolderItemEditor.tsx)

- Import `Save` from lucide-react (replace `Plus`)
- Button labels: "Save Item" (normal), "Save & Next" (during import queue), "Saving..." (while saving)
- Keep the button disabled when title is empty or saving is in progress

### Files Modified

| File | Change |
|------|--------|
| `src/components/folders/FolderDetailDialog.tsx` | Restructure dialog to flex layout with scrollable body and pinned editor |
| `src/components/folders/FolderItemEditor.tsx` | Replace Plus with Save icon, rename button text to "Save Item" / "Save & Next" |
