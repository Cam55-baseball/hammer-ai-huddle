
# Add "Skip for Today" Button to Custom Activity Detail Dialog

## Overview

Add a "Skip for Today" button to the `CustomActivityDetailDialog` component, placed between the "Edit Activity" and "Mark Complete" buttons. This allows users to skip a custom activity directly from its detail view.

## Technical Changes

### 1. Update `CustomActivityDetailDialog` Props (src/components/CustomActivityDetailDialog.tsx)

Add a new optional `onSkipTask` prop to the interface:

```typescript
interface CustomActivityDetailDialogProps {
  // ...existing props
  onSkipTask?: () => void;  // NEW
}
```

### 2. Add Skip Button in the Action Buttons Section (src/components/CustomActivityDetailDialog.tsx)

Between the "Edit Activity" button and the "Mark Complete" button (around lines 837-865), insert a full-width "Skip for Today" button:

```
[Edit Activity]        <-- existing
[Skip for Today]       <-- NEW full-width button
[Mark Complete]        <-- existing
```

The button will:
- Use the `X` icon (already imported)
- Have destructive/warning styling (outline variant with amber/warning colors)
- Call `onSkipTask()` and close the dialog
- Only render when `onSkipTask` is provided

### 3. Pass `onSkipTask` from GamePlanCard (src/components/GamePlanCard.tsx)

In the `CustomActivityDetailDialog` usage (~line 1848), add the `onSkipTask` prop that calls the existing `handleSkipTask` function:

```typescript
onSkipTask={() => {
  if (selectedCustomTask) {
    handleSkipTask(selectedCustomTask.id);
    setDetailDialogOpen(false);
  }
}}
```

### 4. Pass `onSkipTask` from CalendarDaySheet (src/components/calendar/CalendarDaySheet.tsx)

The calendar also renders this dialog (~line 861). Since the calendar may not have skip functionality, we simply omit the prop there (it's optional), so no button will render.

## Summary

| File | Change |
|---|---|
| `src/components/CustomActivityDetailDialog.tsx` | Add `onSkipTask` prop; render skip button between Edit and Complete |
| `src/components/GamePlanCard.tsx` | Pass `onSkipTask` handler to dialog |
