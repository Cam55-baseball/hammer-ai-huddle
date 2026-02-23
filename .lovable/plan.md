

# Two Fixes: RHR Instructions + Toast Auto-Dismiss

## 1. Add Resting Heart Rate Instructions

**File: `src/components/vault/quiz/RestingHeartRateCapture.tsx`**

Add a collapsible "How to measure" instructional section below the label, with clear steps:

- Sit or lie still for 2 minutes
- Place two fingers on the inside of your wrist (below the thumb)
- Count the beats for 15 seconds, then multiply by 4
- Best measured first thing in the morning before getting out of bed
- Mention that smartwatches/fitness trackers can also provide this

This will use a small collapsible info section (toggled by a help icon or "How to measure?" link) so it doesn't clutter the UI for users who already know how.

## 2. Fix Toast Notifications Lingering Too Long

There are two toast systems running simultaneously in the app. Both need to auto-dismiss after 3 seconds:

**File: `src/components/ui/sonner.tsx`**
- Change `duration={2000}` to `duration={3000}` (standardize to 3 seconds as requested)

**File: `src/hooks/use-toast.ts`**
- The radix-based toast system has NO auto-dismiss logic -- toasts stay until manually closed
- Add an auto-dismiss timer: when a toast is added, automatically call `DISMISS_TOAST` after 3000ms
- Update `TOAST_REMOVE_DELAY` to a shorter value (e.g., 1000ms) so dismissed toasts clear from the DOM faster

**File: `src/components/ui/toaster.tsx`**
- Add a `duration={3000}` prop to the `ToastProvider` so radix toasts also auto-close after 3 seconds

### Technical Detail for `use-toast.ts`

In the `toast()` function, after dispatching `ADD_TOAST`, schedule an automatic dismiss:

```typescript
// Auto-dismiss after 3 seconds
setTimeout(() => {
  dismiss();
}, 3000);
```

This ensures that even if the radix `ToastProvider` duration isn't respected for some reason, the toast will still be programmatically dismissed.

## Files to Edit
- `src/components/vault/quiz/RestingHeartRateCapture.tsx` -- add instructional content
- `src/hooks/use-toast.ts` -- add auto-dismiss timer + reduce remove delay
- `src/components/ui/sonner.tsx` -- update duration to 3000ms
- `src/components/ui/toaster.tsx` -- add duration prop to ToastProvider
