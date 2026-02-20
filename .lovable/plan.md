
# Add Delete Button When Clicking the Pencil Icon on Custom Activities

## Current Flow (the problem)

When a user taps the **pencil icon** on a custom activity card in the Game Plan, it opens the **Schedule Settings Drawer** (day/time/reminder settings) — NOT the full activity editor. There is no delete option anywhere in this drawer.

The full activity editor (`CustomActivityBuilderDialog`) **already has a delete button** built in — it appears at the bottom left when editing an existing template. But it's only reachable by: tapping the card → opening the detail dialog → tapping "Edit" inside. That's 2 taps, not intuitive.

## The Fix

Change the pencil icon on custom activity cards in the Game Plan to open the **full activity editor** (which already has the delete button) instead of the schedule drawer.

The schedule drawer functionality is not lost — it remains accessible via the skipped tasks "undo" button and can still be opened from within the editor itself.

### What changes in `src/components/GamePlanCard.tsx`

**Line ~1064-1066** — The pencil button's `onClick` for `isCustom` tasks currently calls `handleCustomActivityScheduleEdit(task)`. Change it to call `handleCustomActivityFullEdit(task)` instead.

**Before:**
```
if (isCustom) {
  handleCustomActivityScheduleEdit(task);
} else { ...
```

**After:**
```
if (isCustom) {
  handleCustomActivityFullEdit(task);
} else { ...
```

That's the core one-line change. The builder dialog already:
- Receives `onDelete` in `GamePlanCard` at lines 1846–1854 ✓
- Shows the red **Delete** button when `isEditing && onDelete` ✓
- Calls `deleteActivityTemplate`, shows a toast, then calls `refetch()` ✓

### Result for the user

1. User taps the **pencil icon** on any custom activity card
2. The full **Activity Builder dialog** opens in edit mode
3. A red **Delete** button is visible at the bottom left of the dialog
4. Tapping Delete soft-deletes the activity (moves it to Recently Deleted with a 30-day recovery window), closes the dialog, and immediately removes the card from the Game Plan

## Files Changed

| File | Change |
|---|---|
| `src/components/GamePlanCard.tsx` | 1-line change: pencil on custom cards opens full editor instead of schedule drawer |

No database changes, no new components, no prop changes needed — the delete logic is already wired end-to-end.
