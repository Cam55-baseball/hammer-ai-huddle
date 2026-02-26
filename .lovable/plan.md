
# Fix Scroll Issue in Folder Detail Dialog

## Problem

The `FolderDetailDialog` uses a flex column layout with `max-h-[85vh]`. The scrollable area (`overflow-y-auto`) only covers the items list section. The `FolderItemEditor` is pinned outside the scroll area with `flex-shrink-0`. Since the editor form is quite tall (title, type, description, schedule toggle, day buttons, duration, notes, import controls, save button), it can consume most of the viewport height, leaving little or no room for the scrollable content above -- making it appear as though scrolling is broken.

## Solution

Move the `FolderItemEditor` section **inside** the scrollable `div` so the entire dialog body (items list + editor) scrolls together. This ensures users can scroll through all content when adding activities.

## Change

### File: `src/components/folders/FolderDetailDialog.tsx`

- Move the "Add Item" block (lines 214-228) from outside the scrollable div to inside it (before the closing `</div>` of the scrollable area at line 212)
- Remove the `flex-shrink-0 border-t pt-3` wrapper and replace with a simple `border-t pt-3 mt-2` div so it still looks visually separated but scrolls with the content
