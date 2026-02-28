

# Cycle Plan System — Critical UX and Functionality Overhaul

## Overview

Four changes: rename the cycle label, fix scroll in the folder edit dialog, add inline cycle-week tagging on activity cards, and restructure the folder detail view with collapsible weekly dropdowns and per-week drag-and-drop ordering.

## 1. Title Rename

**File: `src/components/folders/FolderBuilder.tsx` (line 151)**

Change the label from:
- "How should activities repeat?"

To:
- **"Cycle Plan: How should activities repeat?"**

Simple one-line text change.

## 2. Folder Edit Scroll Fix

**File: `src/components/folders/FolderTabContent.tsx` (lines 271-288)**

The edit dialog at line 272 wraps `FolderBuilder` in a `DialogContent` with no scroll handling. The `FolderBuilder` is a `<Card>` with potentially long content that gets clipped.

Fix: Add `max-h-[85vh] overflow-y-auto` to the `DialogContent` at line 272, matching the pattern used in the folder detail edit dialog (line 598 of `FolderDetailDialog.tsx`).

**File: `src/components/folders/FolderDetailDialog.tsx` (lines 594-610)**

The nested edit dialog at line 598 already has `max-h-[85vh] overflow-y-auto` -- confirm this is intact (it is). No change needed here.

## 3. Inline Cycle-Week Tagging on Activity Cards (No Deep Edit Required)

**File: `src/components/folders/FolderDetailDialog.tsx`**

Currently, to change an activity's cycle week, users must open the full activity builder (pencil icon). This is confusing and heavy.

Add a lightweight inline "Tag to Week" selector directly on each activity card in the folder detail view:

- On each item card (lines 396-475), add a small `Select` dropdown next to the existing badges
- Options: "Every Week", "Week 1", "Week 2", ... up to `folder.cycle_length_weeks`
- Only visible when the folder is a rotating program (`isRotating`)
- On change, directly update `cycle_week` in the database and local state -- no need to open the builder
- Implementation: a new handler `handleQuickCycleWeekChange(itemId, newWeek)` that calls `supabase.from('activity_folder_items').update({ cycle_week: newWeek }).eq('id', itemId)` and updates local `items` state

This gives users a one-tap way to assign/reassign activities to weeks without editing the card.

## 4. Weekly Dropdown Structure with Per-Week Ordering

**File: `src/components/folders/FolderDetailDialog.tsx`**

Replace the current flat item list (with thin week headers) with collapsible weekly sections when the folder is a rotating program:

**A. Collapsible Week Sections**

When `isRotating` and showing all weeks (`!showCurrentWeekOnly`):
- Group `displayItems` by `cycle_week` (null = "Every Week", 1 = "Week 1", etc.)
- Render each group inside a `Collapsible` component (already installed via `@radix-ui/react-collapsible`)
- Each section header shows: "Week 1" with a chevron toggle and item count badge
- The current week's header gets a "(current)" indicator
- Default: current week expanded, others collapsed

**B. Per-Week Drag-and-Drop**

Each weekly section gets its own `DndContext` + `SortableContext`:
- Items can be reordered within their week
- `order_index` is persisted per-week (scoped to items sharing the same `cycle_week`)
- This allows Week 1 to have "Speed before Strength" and Week 2 to have "Strength before Speed" independently

When `showCurrentWeekOnly` is true or the folder is not rotating, keep the existing single flat list with drag-and-drop (unchanged behavior).

**C. "Every Week" section**

Activities with `cycle_week === null` appear in an "Every Week" collapsible section at the top, always expanded by default. These activities show in every rotation week.

## 5. Cycle Behavior Explanation in UI

**File: `src/components/folders/FolderBuilder.tsx`**

The existing explainer (lines 209-225) already covers most of this. Add one additional line inside the explainer to clarify looping behavior:

- After the example block, add: **"The cycle loops forever until you set an end date or archive the folder."**

This explicitly answers "what happens when weeks complete."

## Technical Summary

| File | Changes |
|------|---------|
| `FolderBuilder.tsx` | Rename label to "Cycle Plan: How should activities repeat?"; add loop clarification sentence to explainer |
| `FolderTabContent.tsx` | Add `max-h-[85vh] overflow-y-auto` to the edit folder `DialogContent` |
| `FolderDetailDialog.tsx` | Add inline cycle-week `Select` on each item card; restructure items into collapsible weekly sections with per-week `DndContext`; add `handleQuickCycleWeekChange` handler |

