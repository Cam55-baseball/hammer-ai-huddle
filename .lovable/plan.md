
# Fix: Number Input on Custom Activity Cards Only Allows One Character

## Problem

When you type a number into a custom activity field, each keystroke immediately saves to the database and triggers a full data refetch. The refetch reloads the old value before you can type the next character, effectively resetting your input after every keystroke.

## Solution

Add debounced saving to the number (and text) field inputs in `CustomActivityDetailDialog.tsx`. The input will update locally on every keystroke (so it feels responsive), but the database save will only fire after you stop typing for 800ms.

## Changes

### File: `src/components/CustomActivityDetailDialog.tsx`

**A. Add local state for field values being edited**

Add a `localFieldValues` state (`Record<string, string>`) and a debounce timer ref. When the user types, update `localFieldValues` immediately (for responsive UI), and schedule the actual `onUpdateFieldValue` call after 800ms of inactivity.

**B. Update `getFieldValue` to prefer local state**

If a field ID exists in `localFieldValues`, return that value instead of the persisted one. This prevents the refetch from overwriting what the user is actively typing.

**C. Create a `handleLocalFieldChange` function**

```
function handleLocalFieldChange(fieldId, value):
  1. Update localFieldValues[fieldId] = value  (instant UI update)
  2. Clear any existing debounce timer for this field
  3. Set a new 800ms timer that calls handleUpdateFieldValue(fieldId, value)
  4. On save completion, remove the field from localFieldValues
```

**D. Wire up the number and text inputs**

Change the `onChange` handler for `type="number"` and `type="text"` inputs from `handleUpdateFieldValue` to `handleLocalFieldChange`.

**E. Clean up timers on unmount**

Add a `useEffect` cleanup that clears all pending debounce timers when the dialog closes.

### File: `src/components/GamePlanCard.tsx` -- No changes needed

The `refetch()` call after saving is fine; the local state in the dialog will shield the user from the refetch overwriting their in-progress typing.

## Why This Works

- Typing is instant because the input reads from local state
- The save only fires once you pause typing, preventing rapid DB writes
- After the save completes (and refetch runs), the local override is cleared so the persisted value takes over seamlessly
