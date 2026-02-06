

# Fix Horizontal Text Overflow in Create Activity Dialog (Mobile)

## Problem

When creating a custom activity on mobile, the "Additional Options" section and several other areas overflow horizontally, causing unreadable text and a horizontal scrollbar.

## Root Causes

After reviewing the code, there are **4 specific areas** causing horizontal overflow on mobile:

### 1. CustomFieldsBuilder -- 3-column grid is too wide
In `CustomFieldsBuilder.tsx` (line 87), each custom field row uses `grid grid-cols-3 gap-2` for Label, Value, and Type inputs, plus a drag handle, expand button, and delete button -- all in one row. On a ~375px screen inside a dialog with padding, this creates ~500px+ of content.

### 2. Time Goal inputs -- 4-column grid is too tight  
In `CustomActivityBuilderDialog.tsx` (lines 506 and 646), the running time goal uses `grid grid-cols-4 gap-2` to show Hours, Minutes, Seconds, and Tenths inputs side by side. With labels, this gets cramped and can overflow.

### 3. Dialog missing overflow protection
The `DialogContent` in `CustomActivityBuilderDialog.tsx` (line 361) uses `max-w-2xl` but doesn't have `overflow-hidden` to prevent child content from pushing beyond bounds on mobile.

### 4. Exercise Builder row items not wrapping
In `ExerciseBuilder.tsx` (line 84-138), the collapsed exercise row has a grip handle + input + badges + 3 buttons. On narrow screens, elements can push past the container edge.

## Fix Plan

### File 1: `src/components/custom-activities/CustomFieldsBuilder.tsx`
**Make the custom field row stack on mobile:**
- Change the inner grid from `grid grid-cols-3` to `grid grid-cols-1 sm:grid-cols-3` so on mobile the Label, Value, and Type fields stack vertically
- This keeps the same 3-column layout on larger screens

### File 2: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`
**Add overflow protection and fix time goal grid:**
- Add `overflow-hidden` to the `DialogContent` class (line 361) to prevent any child from causing horizontal scroll
- Change the time goal grids from `grid-cols-4` to `grid-cols-2 sm:grid-cols-4` (lines 506, 646) so on mobile, Hours/Minutes stack on the first row and Seconds/Tenths on the second row
- Ensure all flex containers in the running sessions section use `flex-wrap` and `min-w-0` where needed

### File 3: `src/components/custom-activities/ExerciseBuilder.tsx`
**Ensure exercise rows don't overflow:**
- Add `min-w-0` and `overflow-hidden` to the main exercise row container to contain any long text
- The action buttons already use `flex-shrink-0` which is good

### File 4: `src/components/custom-activities/DragDropExerciseBuilder.tsx`
**Ensure the builder grid doesn't overflow on mobile:**
- Already uses `isMobile` check -- just need to add `overflow-hidden` to the border container wrapping the mobile timeline (line 161)

## Summary of Changes

| File | Change |
|------|--------|
| `CustomFieldsBuilder.tsx` | Stack fields vertically on mobile (`grid-cols-1 sm:grid-cols-3`) |
| `CustomActivityBuilderDialog.tsx` | Add `overflow-hidden` to dialog; change time goal to `grid-cols-2 sm:grid-cols-4` |
| `ExerciseBuilder.tsx` | Add `min-w-0 overflow-hidden` to exercise row container |
| `DragDropExerciseBuilder.tsx` | Add `overflow-hidden` to mobile timeline container |

All changes are CSS-only -- no logic or data changes needed. The layout will remain identical on desktop/tablet and simply reflow to fit on mobile screens.

