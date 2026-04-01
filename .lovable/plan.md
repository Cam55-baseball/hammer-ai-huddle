

# Fix Custom Activity Builder Forced Exit — Real Root Cause

## Problem

The `CustomActivityBuilderDialog` closes unexpectedly whenever users interact with **any dropdown, popover, or picker** inside it. This affects ALL entry points (Templates, Game Plan, Calendar, Folders, Received Activities).

**Root cause:** The `DialogContent` in `CustomActivityBuilderDialog.tsx` (line 396) has NO interaction prevention handlers. The builder contains many portal-rendered elements — `Select` dropdowns, `Popover` (color picker, icon picker, date picker), and `DragOverlay` — that render outside the dialog's DOM tree. Radix Dialog interprets clicks on these portals as "outside" clicks and auto-dismisses.

This is NOT a state management issue in CalendarDaySheet. The previous fix (snapshotting `editingTemplate`) was correct but addressed a secondary problem. The primary issue is the dialog itself dismissing on any portal interaction.

## Fix — One file, one change

**File: `src/components/custom-activities/CustomActivityBuilderDialog.tsx`**

Add three event prevention handlers to `DialogContent` (line 396):

```typescript
<DialogContent 
  className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
>
```

This stops the dialog from closing when users click on Select menus, color pickers, icon pickers, date pickers, or drag overlays. The dialog will only close via the explicit X button or Cancel/Save actions.

## Why this was missed

Previous investigations focused on state lifecycle in CalendarDaySheet. The actual dismissal happens inside the Radix Dialog primitive, not in React state. The symptom (getting "kicked out") looks identical whether caused by state teardown or dialog auto-dismiss, but the fix is completely different.

## Files

| File | Change |
|------|--------|
| `src/components/custom-activities/CustomActivityBuilderDialog.tsx` | Add `onPointerDownOutside`, `onInteractOutside`, `onFocusOutside` to `DialogContent` |

